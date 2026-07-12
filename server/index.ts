// Standalone Node WebSocket game server — a plain-Node port of the PartyKit
// room server in party/server.ts, so the backend can run on any Node host
// (Render, Railway, Fly, a VPS…) instead of only Cloudflare/PartyKit.
//
// It reuses the exact same pure engine (src/engine) and Zod protocol
// (src/shared/protocol) as the PartyKit version — only the transport differs.
// It serves the same URL path the client already uses, `/parties/main/<room>`,
// so the front end connects unchanged (just point NEXT_PUBLIC_PARTYKIT_HOST at
// this server's host).

import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  addPlayer,
  autoPass,
  callUno,
  catchMissedUno,
  createRoom,
  drawCard,
  getClientView,
  passAfterDraw,
  playCard,
  playCards,
  removePlayer,
  RoomState,
  setConnected,
  startNextRound,
  startRound,
  Result,
} from "../src/engine";
import { DEFAULT_CONFIG } from "../src/engine/types";
import {
  clientMessageSchema,
  ClientMessage,
  ServerMessage,
} from "../src/shared/protocol";

/**
 * How long the current player has to act before the server auto-passes their
 * turn. Applies to everyone (connected idlers and disconnected players alike),
 * and drives the on-screen countdown via `state.turnDeadline`.
 */
const TURN_TIMEOUT_MS = 30_000;
const PORT = Number(process.env.PORT) || 1999;
/** Drop rooms with no live sockets after this long, to avoid a memory leak. */
const EMPTY_ROOM_TTL_MS = 30 * 60_000;

interface Room {
  code: string;
  state: RoomState;
  /** live socket -> playerId (only populated once a socket has joined/rejoined) */
  conns: Map<WebSocket, string>;
  /** The single active turn timer, or null when no round is running. */
  turnTimer: ReturnType<typeof setTimeout> | null;
  /** epoch ms since the room last had zero connections, or null if occupied */
  emptySince: number | null;
}

const rooms = new Map<string, Room>();

function getRoom(code: string): Room {
  const key = code.toUpperCase();
  let room = rooms.get(key);
  if (!room) {
    room = {
      code: key,
      state: createRoom(key, { ...DEFAULT_CONFIG }),
      conns: new Map(),
      turnTimer: null,
      emptySince: Date.now(),
    };
    rooms.set(key, room);
  }
  return room;
}

const json = (msg: ServerMessage): string => JSON.stringify(msg);
const send = (ws: WebSocket, msg: ServerMessage) => {
  if (ws.readyState === ws.OPEN) ws.send(json(msg));
};
const reject = (ws: WebSocket, reason: string) =>
  send(ws, { type: "invalidAction", reason });

/** Send each joined socket in the room its own personalized snapshot. */
function broadcastState(room: Room) {
  for (const [ws, playerId] of room.conns) {
    send(ws, { type: "stateUpdate", view: getClientView(room.state, playerId) });
  }
}

function bind(room: Room, ws: WebSocket, playerId: string) {
  room.conns.set(ws, playerId);
}

/**
 * (Re)arm the current player's turn clock. Records the deadline on the state so
 * every client can render a matching countdown, and schedules the auto-pass
 * that fires if they don't act in time. Clears the clock outside a round.
 */
function armTurnTimer(room: Room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  if (room.state.phase !== "in_round") {
    room.state.turnDeadline = null;
    return;
  }
  room.state.turnDeadline = Date.now() + TURN_TIMEOUT_MS;
  room.turnTimer = setTimeout(() => onTurnTimeout(room), TURN_TIMEOUT_MS + 50);
}

/** The current player ran out of time — auto-pass them and re-arm for the next. */
function onTurnTimeout(room: Room) {
  room.turnTimer = null;
  if (room.state.phase !== "in_round") {
    room.state.turnDeadline = null;
    return;
  }
  const cur = room.state.players.find((p) => p.seat === room.state.currentSeat);
  if (cur) autoPass(room.state, cur.playerId);
  armTurnTimer(room); // for whoever's turn it is now (or the same player if stuck)
  broadcastState(room);
}

function handle(room: Room, ws: WebSocket, msg: ClientMessage) {
  const state = room.state;

  switch (msg.type) {
    case "joinRoom": {
      // The very first joiner may seed the room config.
      if (state.players.length === 0 && msg.config) {
        state.config = msg.config;
      }
      const r = addPlayer(state, msg.playerId, msg.displayName);
      if (!r.ok) return reject(ws, r.reason);
      bind(room, ws, msg.playerId);
      send(ws, { type: "joined", playerId: msg.playerId });
      broadcastState(room);
      return;
    }
    case "rejoin": {
      const exists = state.players.some((p) => p.playerId === msg.playerId);
      if (!exists) return reject(ws, "No seat to rejoin");
      bind(room, ws, msg.playerId);
      setConnected(state, msg.playerId, true);
      send(ws, { type: "joined", playerId: msg.playerId });
      broadcastState(room);
      return;
    }
    default:
      break;
  }

  const playerId = room.conns.get(ws);
  if (!playerId) return reject(ws, "Join first");

  const isHost = state.hostPlayerId === playerId;
  let r: Result = { ok: true };
  // Snapshot the turn/phase so we can (re)arm the clock only when play actually
  // moves on — not on side actions like calling or catching an UNO.
  const prevSeat = state.currentSeat;
  const prevPhase = state.phase;

  switch (msg.type) {
    case "setConfig":
      if (!isHost) return reject(ws, "Host only");
      if (state.phase !== "lobby") return reject(ws, "Lobby only");
      state.config = msg.config;
      break;
    case "startGame":
      if (!isHost) return reject(ws, "Host only");
      r = startRound(state);
      break;
    case "playCard":
      r = playCard(state, playerId, msg.uid, msg.chosenColor);
      break;
    case "playCards":
      r = playCards(state, playerId, msg.uids, msg.chosenColor);
      break;
    case "drawCard":
      r = drawCard(state, playerId);
      break;
    case "passAfterDraw":
      r = passAfterDraw(state, playerId);
      break;
    case "callUno":
      r = callUno(state, playerId);
      break;
    case "catchMissedUno":
      r = catchMissedUno(state, playerId, msg.targetPlayerId);
      break;
    case "startNextRound":
      if (!isHost) return reject(ws, "Host only");
      r = startNextRound(state);
      break;
    case "leaveRoom":
      removePlayer(state, playerId);
      room.conns.delete(ws);
      break;
  }

  if (!r.ok) return reject(ws, r.reason);
  if (state.currentSeat !== prevSeat || state.phase !== prevPhase) armTurnTimer(room);
  broadcastState(room);
}

function onMessage(room: Room, ws: WebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = clientMessageSchema.parse(JSON.parse(raw));
  } catch {
    return reject(ws, "Malformed message");
  }
  handle(room, ws, msg);
}

function onClose(room: Room, ws: WebSocket) {
  const playerId = room.conns.get(ws);
  if (!playerId) {
    if (room.conns.size === 0) room.emptySince = Date.now();
    return;
  }
  room.conns.delete(ws);

  // Only mark disconnected if no other live socket holds this identity. The
  // running turn timer covers a disconnected current player; when it's someone
  // else's turn, their clock arms when play reaches them.
  const stillHere = [...room.conns.values()].includes(playerId);
  if (!stillHere) {
    setConnected(room.state, playerId, false);
    if (room.state.phase === "lobby") removePlayer(room.state, playerId);
    broadcastState(room);
  }

  if (room.conns.size === 0) room.emptySince = Date.now();
}

// ---------------------------------------------------------------------------
// HTTP + WebSocket wiring
// ---------------------------------------------------------------------------

const server = createServer((req, res) => {
  // Plain HTTP hits (health checks, a curious browser) get a friendly 200 so
  // hosts like Render see the port as live.
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Custom UNO game server — connect over WebSocket at /parties/main/<ROOM>\n");
});

const wss = new WebSocketServer({ noServer: true });

/** Extract the room code from a `/parties/<party>/<room>` path (query ignored). */
function roomCodeFromUrl(url: string | undefined): string | null {
  const path = new URL(url || "/", "http://localhost").pathname;
  const parts = path.split("/").filter(Boolean);
  const code = parts[parts.length - 1];
  return code && code.toLowerCase() !== "main" && parts.includes("parties") ? code : null;
}

server.on("upgrade", (req: IncomingMessage, socket, head) => {
  const code = roomCodeFromUrl(req.url);
  if (!code) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, code);
  });
});

wss.on("connection", (ws: WebSocket, _req: IncomingMessage, code: string) => {
  const room = getRoom(code);
  room.emptySince = null;
  // Identity is established via the first joinRoom/rejoin message, not the socket.
  send(ws, { type: "error", reason: "awaiting-join" });
  ws.on("message", (data) => onMessage(room, ws, data.toString()));
  ws.on("close", () => onClose(room, ws));
  ws.on("error", () => ws.close());
});

// Sweep out long-empty rooms so memory doesn't grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, room] of rooms) {
    if (
      room.conns.size === 0 &&
      room.emptySince !== null &&
      now - room.emptySince > EMPTY_ROOM_TTL_MS
    ) {
      if (room.turnTimer) clearTimeout(room.turnTimer);
      rooms.delete(key);
    }
  }
}, 60_000).unref();

server.listen(PORT, () => {
  console.log(`Custom UNO game server listening on :${PORT}`);
});

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

const DISCONNECT_GRACE_MS = 30_000;
const PORT = Number(process.env.PORT) || 1999;
/** Drop rooms with no live sockets after this long, to avoid a memory leak. */
const EMPTY_ROOM_TTL_MS = 30 * 60_000;

interface Room {
  code: string;
  state: RoomState;
  /** live socket -> playerId (only populated once a socket has joined/rejoined) */
  conns: Map<WebSocket, string>;
  /** playerId -> pending auto-pass timer */
  timers: Map<string, ReturnType<typeof setTimeout>>;
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
      timers: new Map(),
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
  clearTimer(room, playerId);
}

function clearTimer(room: Room, playerId: string) {
  const t = room.timers.get(playerId);
  if (t) clearTimeout(t);
  room.timers.delete(playerId);
}

/** After a turn moves, (re)start the disconnect grace timer for the new player. */
function onTurnAdvanced(room: Room) {
  if (room.state.phase !== "in_round") return;
  const cur = room.state.players.find((p) => p.seat === room.state.currentSeat);
  if (cur && !cur.connected) scheduleAutoPass(room, cur.playerId);
}

function scheduleAutoPass(room: Room, playerId: string) {
  clearTimer(room, playerId);
  const cur = room.state.players.find((p) => p.seat === room.state.currentSeat);
  if (room.state.phase !== "in_round" || !cur || cur.playerId !== playerId) return;

  const t = setTimeout(() => {
    const r = autoPass(room.state, playerId);
    if (r.ok) onTurnAdvanced(room);
    broadcastState(room);
  }, DISCONNECT_GRACE_MS);
  room.timers.set(playerId, t);
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
      clearTimer(room, msg.playerId);
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
      if (r.ok) onTurnAdvanced(room);
      break;
    case "playCards":
      r = playCards(state, playerId, msg.uids, msg.chosenColor);
      if (r.ok) onTurnAdvanced(room);
      break;
    case "drawCard":
      r = drawCard(state, playerId);
      if (r.ok) onTurnAdvanced(room);
      break;
    case "passAfterDraw":
      r = passAfterDraw(state, playerId);
      if (r.ok) onTurnAdvanced(room);
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
      if (r.ok) onTurnAdvanced(room);
      break;
    case "leaveRoom":
      removePlayer(state, playerId);
      room.conns.delete(ws);
      break;
  }

  if (!r.ok) return reject(ws, r.reason);
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

  // Only mark disconnected if no other live socket holds this identity.
  const stillHere = [...room.conns.values()].includes(playerId);
  if (!stillHere) {
    setConnected(room.state, playerId, false);
    scheduleAutoPass(room, playerId);
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
      for (const t of room.timers.values()) clearTimeout(t);
      rooms.delete(key);
    }
  }
}, 60_000).unref();

server.listen(PORT, () => {
  console.log(`Custom UNO game server listening on :${PORT}`);
});

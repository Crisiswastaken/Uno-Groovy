import type * as Party from "partykit/server";
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

export default class UnoServer implements Party.Server {
  state: RoomState;
  /** connectionId -> playerId */
  conns = new Map<string, string>();
  /** The single active turn timer, or null when no round is running. */
  turnTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {
    this.state = createRoom(room.id.toUpperCase(), { ...DEFAULT_CONFIG });
  }

  onConnect(conn: Party.Connection) {
    // Identity is established via the first joinRoom/rejoin message, not the socket.
    conn.send(json({ type: "error", reason: "awaiting-join" }));
  }

  onMessage(raw: string, conn: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = clientMessageSchema.parse(JSON.parse(raw));
    } catch {
      conn.send(json({ type: "invalidAction", reason: "Malformed message" }));
      return;
    }
    this.handle(msg, conn);
  }

  onClose(conn: Party.Connection) {
    const playerId = this.conns.get(conn.id);
    if (!playerId) return;
    this.conns.delete(conn.id);

    // Only mark disconnected if no other live socket holds this identity.
    const stillHere = [...this.conns.values()].includes(playerId);
    if (stillHere) return;

    // The running turn timer covers a disconnected current player; when it's
    // someone else's turn, their clock arms when play reaches them.
    setConnected(this.state, playerId, false);

    if (this.state.phase === "lobby") {
      removePlayer(this.state, playerId);
    }
    if (this.state.players.every((p) => !p.connected)) {
      // Everyone gone — let the room fall idle; state is dropped by PartyKit.
    }
    this.broadcastState();
  }

  // -------------------------------------------------------------------------

  private handle(msg: ClientMessage, conn: Party.Connection) {
    switch (msg.type) {
      case "joinRoom": {
        // The very first joiner may seed the room config.
        if (this.state.players.length === 0 && msg.config) {
          this.state.config = msg.config;
        }
        const r = addPlayer(this.state, msg.playerId, msg.displayName);
        if (!r.ok) return this.reject(conn, r.reason);
        this.bind(conn, msg.playerId);
        conn.send(json({ type: "joined", playerId: msg.playerId }));
        this.broadcastState();
        return;
      }
      case "rejoin": {
        const exists = this.state.players.some((p) => p.playerId === msg.playerId);
        if (!exists) return this.reject(conn, "No seat to rejoin");
        this.bind(conn, msg.playerId);
        setConnected(this.state, msg.playerId, true);
        conn.send(json({ type: "joined", playerId: msg.playerId }));
        this.broadcastState();
        return;
      }
      default:
        break;
    }

    const playerId = this.conns.get(conn.id);
    if (!playerId) return this.reject(conn, "Join first");

    const isHost = this.state.hostPlayerId === playerId;
    let r: Result = { ok: true };
    // Snapshot the turn/phase so we (re)arm the clock only when play actually
    // moves on — not on side actions like calling or catching an UNO.
    const prevSeat = this.state.currentSeat;
    const prevPhase = this.state.phase;

    switch (msg.type) {
      case "setConfig":
        if (!isHost) return this.reject(conn, "Host only");
        if (this.state.phase !== "lobby") return this.reject(conn, "Lobby only");
        this.state.config = msg.config;
        break;
      case "startGame":
        if (!isHost) return this.reject(conn, "Host only");
        r = startRound(this.state);
        break;
      case "playCard":
        r = playCard(this.state, playerId, msg.uid, msg.chosenColor);
        break;
      case "playCards":
        r = playCards(this.state, playerId, msg.uids, msg.chosenColor);
        break;
      case "drawCard":
        r = drawCard(this.state, playerId);
        break;
      case "passAfterDraw":
        r = passAfterDraw(this.state, playerId);
        break;
      case "callUno":
        r = callUno(this.state, playerId);
        break;
      case "catchMissedUno":
        r = catchMissedUno(this.state, playerId, msg.targetPlayerId);
        break;
      case "startNextRound":
        if (!isHost) return this.reject(conn, "Host only");
        r = startNextRound(this.state);
        break;
      case "leaveRoom":
        removePlayer(this.state, playerId);
        this.conns.delete(conn.id);
        break;
    }

    if (!r.ok) return this.reject(conn, r.reason);
    if (this.state.currentSeat !== prevSeat || this.state.phase !== prevPhase) {
      this.armTurnTimer();
    }
    this.broadcastState();
  }

  // -------------------------------------------------------------------------

  private bind(conn: Party.Connection, playerId: string) {
    this.conns.set(conn.id, playerId);
  }

  private reject(conn: Party.Connection, reason: string) {
    conn.send(json({ type: "invalidAction", reason }));
  }

  /**
   * (Re)arm the current player's turn clock. Records the deadline on the state
   * so every client can render a matching countdown, and schedules the auto-pass
   * that fires if they don't act in time. Clears the clock outside a round.
   */
  private armTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    if (this.state.phase !== "in_round") {
      this.state.turnDeadline = null;
      return;
    }
    this.state.turnDeadline = Date.now() + TURN_TIMEOUT_MS;
    this.turnTimer = setTimeout(() => this.onTurnTimeout(), TURN_TIMEOUT_MS + 50);
  }

  /** The current player ran out of time — auto-pass them and re-arm the clock. */
  private onTurnTimeout() {
    this.turnTimer = null;
    if (this.state.phase !== "in_round") {
      this.state.turnDeadline = null;
      return;
    }
    const cur = this.state.players.find((p) => p.seat === this.state.currentSeat);
    if (cur) autoPass(this.state, cur.playerId);
    this.armTurnTimer();
    this.broadcastState();
  }

  /** Send each connected socket its own personalized snapshot. */
  private broadcastState() {
    for (const conn of this.room.getConnections()) {
      const playerId = this.conns.get(conn.id);
      if (!playerId) continue;
      const view = getClientView(this.state, playerId);
      conn.send(json({ type: "stateUpdate", view }));
    }
  }
}

function json(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

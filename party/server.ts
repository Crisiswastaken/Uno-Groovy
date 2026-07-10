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

const DISCONNECT_GRACE_MS = 30_000;

export default class UnoServer implements Party.Server {
  state: RoomState;
  /** connectionId -> playerId */
  conns = new Map<string, string>();
  /** playerId -> pending auto-pass timer */
  timers = new Map<string, ReturnType<typeof setTimeout>>();

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
    } catch (e) {
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

    setConnected(this.state, playerId, false);
    this.scheduleAutoPass(playerId);

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
        this.clearTimer(msg.playerId);
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
        if (r.ok) this.onTurnAdvanced();
        break;
      case "playCards":
        r = playCards(this.state, playerId, msg.uids, msg.chosenColor);
        if (r.ok) this.onTurnAdvanced();
        break;
      case "drawCard":
        r = drawCard(this.state, playerId);
        if (r.ok) this.onTurnAdvanced();
        break;
      case "passAfterDraw":
        r = passAfterDraw(this.state, playerId);
        if (r.ok) this.onTurnAdvanced();
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
        if (r.ok) this.onTurnAdvanced();
        break;
      case "leaveRoom":
        removePlayer(this.state, playerId);
        this.conns.delete(conn.id);
        break;
    }

    if (!r.ok) return this.reject(conn, r.reason);
    this.broadcastState();
  }

  // -------------------------------------------------------------------------

  private bind(conn: Party.Connection, playerId: string) {
    this.conns.set(conn.id, playerId);
    this.clearTimer(playerId);
  }

  private reject(conn: Party.Connection, reason: string) {
    conn.send(json({ type: "invalidAction", reason }));
  }

  /** After a turn moves, (re)start the disconnect grace timer for the new player. */
  private onTurnAdvanced() {
    if (this.state.phase !== "in_round") return;
    const cur = this.state.players.find((p) => p.seat === this.state.currentSeat);
    if (cur && !cur.connected) this.scheduleAutoPass(cur.playerId);
  }

  private scheduleAutoPass(playerId: string) {
    this.clearTimer(playerId);
    const cur = this.state.players.find((p) => p.seat === this.state.currentSeat);
    if (this.state.phase !== "in_round" || !cur || cur.playerId !== playerId) return;

    const t = setTimeout(() => {
      const r = autoPass(this.state, playerId);
      if (r.ok) this.onTurnAdvanced();
      this.broadcastState();
    }, DISCONNECT_GRACE_MS);
    this.timers.set(playerId, t);
  }

  private clearTimer(playerId: string) {
    const t = this.timers.get(playerId);
    if (t) clearTimeout(t);
    this.timers.delete(playerId);
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

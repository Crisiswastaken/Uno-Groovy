"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import { useGameStore } from "../store/gameStore";
import { useSensoryUI } from "../lib/provider";
import type { RuleConfig } from "../engine/types";
import type { ClientMessage, ServerMessage } from "../shared/protocol";
import { clearCreate, getName, getOrCreatePlayerId, peekCreate } from "./../lib/identity";

const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";

/** HTTP origin of the game server, derived from the socket host. */
function serverOrigin(): string {
  const local = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.)/.test(PARTY_HOST);
  if (/^https?:\/\//.test(PARTY_HOST)) return PARTY_HOST;
  return `${local ? "http" : "https"}://${PARTY_HOST}`;
}

/* Cold-start handling. The backend sleeps when idle on a free host, so the
   first request after a lull waits out a container boot (tens of seconds). Two
   things go wrong without help:

     1. The player stares at an unexplained spinner. → After WAKE_AFTER_MS with
        no room state we say so, and poll /health so we can tell "booting" from
        "you're offline".
     2. The join itself can be lost — sent into a socket the edge proxy accepted
        and then dropped while the container was still starting, so the room is
        never created and the spinner never ends. → A watchdog re-sends the join
        every JOIN_RETRY_MS until state arrives. Joining is idempotent server
        side (addPlayer returns ok for a player already seated). */

/** No room state for this long → tell the player the server is waking up. */
const WAKE_AFTER_MS = 3500;
/** Re-send the join while connected but unseated. */
const JOIN_RETRY_MS = 2500;
/** How often to re-probe /health while we're waiting. */
const HEALTH_POLL_MS = 4000;

export type RoomStatus = {
  /** Nothing has arrived yet and it's taking long enough to explain. */
  waking: boolean;
  /** Seconds spent waiting so far, for a "this can take a minute" message. */
  waitedSec: number;
  /** The server answered /health — it's up, we're just not seated yet. */
  serverUp: boolean;
};

type Intent =
  | { kind: "waiting" }
  | { kind: "host"; displayName: string; config: RuleConfig }
  | { kind: "player"; displayName: string };

/**
 * Connects to a room's game server, establishes identity (rejoin first, falling
 * back to a fresh join), and streams personalized state into the store.
 */
export function useRoom(code: string) {
  const socketRef = useRef<PartySocket | null>(null);
  const { view, connected, setView, setConnected, pushToast } = useGameStore();
  // Read inside the watchdog without making it a dependency: a cold backend
  // flaps this flag on every failed attempt, and restarting the effect would
  // reset the elapsed-time clock each time.
  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  // Keep the latest playSound in a ref so the socket effect (created once per
  // room) can sound rejected actions without re-subscribing.
  const { playSound } = useSensoryUI();
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;
  const [needsName, setNeedsName] = useState(false);
  const intentRef = useRef<Intent>({ kind: "waiting" });
  const playerIdRef = useRef<string>("");
  const [status, setStatus] = useState<RoomStatus>({
    waking: false,
    waitedSec: 0,
    serverUp: false,
  });

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  /** Send the join that matches our intent. Safe to repeat — see the watchdog. */
  const attemptJoin = useCallback(() => {
    const intent = intentRef.current;
    const playerId = playerIdRef.current;
    if (intent.kind === "waiting" || !playerId) return;
    if (intent.kind === "host") {
      send({
        type: "joinRoom",
        playerId,
        displayName: intent.displayName,
        config: intent.config,
      });
    } else {
      send({ type: "joinRoom", playerId, displayName: intent.displayName });
    }
  }, [send]);

  // Resolve intent (host create payload / stored name / need-name) on mount.
  useEffect(() => {
    if (!code) return;
    playerIdRef.current = getOrCreatePlayerId(code);
    // Peeked, not taken: the rules must survive a reload of a page that never
    // managed to join (a cold backend), so they're cleared only once we're in.
    const create = peekCreate(code);
    const stored = getName(code);
    if (stored) {
      intentRef.current = create
        ? { kind: "host", displayName: stored, config: create.config }
        : { kind: "player", displayName: stored };
    } else {
      setNeedsName(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Open the socket.
  useEffect(() => {
    if (!code) return;
    const socket = new PartySocket({ host: PARTY_HOST, room: code });
    socketRef.current = socket;

    const onOpen = () => {
      setConnected(true);
      // Try rejoin first; the server falls us back to join if there's no seat.
      const playerId = playerIdRef.current;
      if (playerId) send({ type: "rejoin", playerId });
    };
    const onClose = () => setConnected(false);
    const onMessage = (e: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case "stateUpdate":
          setView(msg.view);
          // We're seated: the one-shot create handoff has done its job.
          if (msg.view.players.some((p) => p.playerId === playerIdRef.current)) {
            clearCreate(code);
          }
          break;
        case "joined":
          break;
        case "invalidAction":
          if (msg.reason === "No seat to rejoin" || msg.reason === "Room no longer exists") {
            attemptJoin(); // fall back to a fresh join
          } else {
            void playSoundRef.current("notification.error");
            pushToast(msg.reason, "error");
          }
          break;
        case "error":
          // "awaiting-join" is expected pre-identity; ignore.
          break;
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Watchdog: while we have no room state, keep re-announcing ourselves and
  // report how long the wait has run. Stops the moment a view lands.
  const seated = !!view;
  useEffect(() => {
    // The clock only starts once we actually have an identity to join with —
    // otherwise time spent on the name gate would be reported as a server wait.
    if (!code || seated || needsName) {
      setStatus({ waking: false, waitedSec: 0, serverUp: false });
      return;
    }
    const started = Date.now();
    let cancelled = false;

    const tick = window.setInterval(() => {
      const waited = Date.now() - started;
      setStatus((s) => ({
        ...s,
        waking: waited > WAKE_AFTER_MS,
        waitedSec: Math.floor(waited / 1000),
      }));
    }, 500);

    // Only worth re-sending over a live socket: a closed one queues the message
    // internally, so an offline stretch would just pile up duplicate joins.
    const retry = window.setInterval(() => {
      if (connectedRef.current && intentRef.current.kind !== "waiting") attemptJoin();
    }, JOIN_RETRY_MS);

    // Probe the server's HTTP side so a boot in progress can be reported as
    // such. A failed probe just means "not yet" — the socket keeps retrying
    // either way, so this never gates the connection.
    const probe = async () => {
      try {
        const res = await fetch(`${serverOrigin()}/health`, { cache: "no-store" });
        if (!cancelled) setStatus((s) => ({ ...s, serverUp: res.ok }));
      } catch {
        if (!cancelled) setStatus((s) => ({ ...s, serverUp: false }));
      }
    };
    void probe();
    const poll = window.setInterval(probe, HEALTH_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      window.clearInterval(retry);
      window.clearInterval(poll);
    };
  }, [code, seated, needsName, attemptJoin]);

  // Called by the name-gate form for players joining via a shared link.
  const submitName = useCallback(
    (displayName: string) => {
      setNeedsName(false);
      const create = peekCreate(code);
      intentRef.current = create
        ? { kind: "host", displayName, config: create.config }
        : { kind: "player", displayName };
      attemptJoin();
    },
    [code, attemptJoin],
  );

  return { send, needsName, submitName, status, playerId: playerIdRef.current };
}

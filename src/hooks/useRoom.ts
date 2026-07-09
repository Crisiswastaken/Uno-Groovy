"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import { useGameStore } from "../store/gameStore";
import type { RuleConfig } from "../engine/types";
import type { ClientMessage, ServerMessage } from "../shared/protocol";
import { getName, getOrCreatePlayerId, takeCreate } from "./../lib/identity";

const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";

type Intent =
  | { kind: "waiting" }
  | { kind: "host"; displayName: string }
  | { kind: "player"; displayName: string };

/**
 * Connects to a room's PartyKit party, establishes identity (rejoin first,
 * falling back to a fresh join), and streams personalized state into the store.
 */
export function useRoom(code: string) {
  const socketRef = useRef<PartySocket | null>(null);
  const { setView, setConnected, pushToast } = useGameStore();
  const [needsName, setNeedsName] = useState(false);
  const intentRef = useRef<Intent>({ kind: "waiting" });
  const playerIdRef = useRef<string>("");
  // Set when this client created the room: carries the rules until the host
  // picks a name (which they now do on the room screen, like everyone else).
  const hostConfigRef = useRef<RuleConfig | undefined>(undefined);

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  // Resolve intent (host create payload / stored name / need-name) on mount.
  useEffect(() => {
    if (!code) return;
    playerIdRef.current = getOrCreatePlayerId(code);
    const create = takeCreate(code);
    if (create) {
      // We created the room. Hold the rules; the host still names themselves.
      hostConfigRef.current = create.config;
      const stored = getName(code);
      if (stored) {
        intentRef.current = { kind: "host", displayName: stored };
        (intentRef as any).config = create.config;
      } else {
        setNeedsName(true);
      }
    } else {
      const stored = getName(code);
      if (stored) {
        intentRef.current = { kind: "player", displayName: stored };
      } else {
        setNeedsName(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Open the socket.
  useEffect(() => {
    if (!code) return;
    const socket = new PartySocket({ host: PARTY_HOST, room: code });
    socketRef.current = socket;

    const doInitialJoin = () => {
      const playerId = playerIdRef.current;
      if (!playerId) return;
      // Try rejoin first; server falls us back to join if there's no seat.
      send({ type: "rejoin", playerId });
    };

    const attemptJoin = () => {
      const intent = intentRef.current;
      const playerId = playerIdRef.current;
      if (intent.kind === "waiting") return;
      if (intent.kind === "host") {
        send({
          type: "joinRoom",
          playerId,
          displayName: intent.displayName,
          config: (intentRef as any).config,
        });
      } else {
        send({
          type: "joinRoom",
          playerId,
          displayName: intent.displayName,
        });
      }
    };

    const onOpen = () => {
      setConnected(true);
      doInitialJoin();
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
          break;
        case "joined":
          break;
        case "invalidAction":
          if (msg.reason === "No seat to rejoin") {
            attemptJoin(); // fall back to a fresh join
          } else {
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

  // Called by the name-gate form for players joining via a shared link.
  const submitName = useCallback(
    (displayName: string) => {
      setNeedsName(false);
      const config = hostConfigRef.current;
      if (config) {
        // Host naming themselves: join and establish the room's rules.
        intentRef.current = { kind: "host", displayName };
        (intentRef as any).config = config;
        send({ type: "joinRoom", playerId: playerIdRef.current, displayName, config });
      } else {
        intentRef.current = { kind: "player", displayName };
        send({ type: "joinRoom", playerId: playerIdRef.current, displayName });
      }
    },
    [send],
  );

  return { send, needsName, submitName, playerId: playerIdRef.current };
}

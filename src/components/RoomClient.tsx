"use client";

import { useRoom } from "../hooks/useRoom";
import { useGameSounds } from "../hooks/useGameSounds";
import { Card } from "./ui/Card";
import { Spinner } from "./ui/Spinner";
import { setName } from "../lib/identity";
import { useGameStore } from "../store/gameStore";
import { GameTable } from "./GameTable";
import { Lobby } from "./Lobby";
import { NameGate } from "./NameGate";
import { RoundEnd } from "./RoundEnd";
import { Toasts } from "./Toasts";

/**
 * Full-bleed groovy game board. The art is designed for the table (the
 * scalloped star sits dead-center), so it's rendered edge-to-edge with no
 * blur or wash — the centered star is where the played cards land.
 */
function RoomBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-uno-cream">
      <Card
        src="/game/background.png"
        alt=""
        fill
        rounded={false}
        priority
        sizes="100vw"
        className="object-cover select-none"
      />
    </div>
  );
}

export function RoomClient({ code }: { code: string }) {
  const { send, needsName, submitName } = useRoom(code);
  const { view, connected } = useGameStore();

  // Derive playful sound cues (opponent plays, specials, your turn, wins) by
  // diffing successive snapshots. Called unconditionally before any early
  // return so hook order stays stable; no-ops until a view arrives.
  useGameSounds(view);

  if (needsName) {
    return (
      <NameGate
        code={code}
        onSubmit={(name) => {
          setName(code, name);
          submitName(name);
        }}
      />
    );
  }

  if (!view) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <div className="text-center">
            <div className="text-uno-ink1 font-medium">
              {connected ? "Entering room…" : "Connecting…"}
            </div>
            <div className="text-xs text-uno-ink2 mt-1 tracking-widest">{code}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* The groovy table art belongs to the play area only; the lobby brings
          its own calmer backdrop. */}
      {view.phase !== "lobby" && <RoomBackground />}
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-uno-red text-uno-cream text-center text-sm font-semibold py-1">
          reconnecting…
        </div>
      )}
      {view.phase === "lobby" && <Lobby view={view} send={send} />}
      {view.phase === "in_round" && <GameTable view={view} send={send} />}
      {(view.phase === "round_end" || view.phase === "match_end") && (
        <RoundEnd view={view} send={send} />
      )}
      <Toasts />
    </>
  );
}

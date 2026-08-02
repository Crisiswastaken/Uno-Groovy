"use client";

import { useRoom } from "../hooks/useRoom";
import { useEndHold } from "../hooks/useEndHold";
import { useGameSounds } from "../hooks/useGameSounds";
import { useIsPhone } from "../hooks/useIsPhone";
import { Card } from "./ui/Card";
import { Spinner } from "./ui/Spinner";
import { setName } from "../lib/identity";
import { useGameStore } from "../store/gameStore";
import { GameTable } from "./GameTable";
import { MobileGameTable } from "./MobileGameTable";
import { Lobby } from "./Lobby";
import { NameGate } from "./NameGate";
import { RoundEnd } from "./RoundEnd";
import { Toasts } from "./Toasts";

/**
 * Full-bleed groovy game board. The art is designed for the table (the
 * scalloped star sits dead-center), so it's rendered edge-to-edge with no
 * blur or wash — the centered star is where the played cards land.
 */
function RoomBackground({ isPhone }: { isPhone: boolean }) {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-uno-cream">
      <Card
        src={isPhone ? "/game/mobile-background.png" : "/game/background.png"}
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
  const { send, needsName, submitName, status } = useRoom(code);
  const { view, connected } = useGameStore();
  const isPhone = useIsPhone();

  // Derive playful sound cues (opponent plays, specials, your turn, wins) by
  // diffing successive snapshots. Called unconditionally before any early
  // return so hook order stays stable; no-ops until a view arrives.
  useGameSounds(view);

  // Hold the final board for a beat before the win screen takes over, so the
  // last card is actually seen (also unconditional — hooks before returns).
  const { shownPhase, exiting } = useEndHold(view?.phase);

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
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <div className="text-center">
            <div className="text-uno-ink1 font-medium">
              {status.waking
                ? "Waking the game server…"
                : connected
                  ? "Entering room…"
                  : "Connecting…"}
            </div>
            <div className="text-xs text-uno-ink2 mt-1 tracking-widest">{code}</div>
          </div>

          {/* The backend sleeps when idle on its free tier, so the first player
              back pays for a cold boot. Say so rather than spinning silently —
              and keep saying it, with the elapsed time, so the wait reads as
              progress instead of a hang. */}
          {status.waking && (
            <div className="max-w-[22rem] text-center rounded-card border-2 border-uno-ink/10 bg-uno-white1 px-5 py-4">
              <p className="text-sm font-semibold text-uno-ink">
                {status.serverUp
                  ? "The server is up — getting you seated…"
                  : "The server is starting up after being idle."}
              </p>
              <p className="text-xs text-uno-ink2 mt-1.5">
                This can take a minute or two on the free tier. Keep this page
                open — it connects on its own as soon as the server is ready.
              </p>
              <p className="text-[11px] text-uno-ink2 mt-2 tabular-nums">
                waiting {status.waitedSec}s
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      {/* The groovy table art belongs to the play area only (it rides inside the
          in-round wrapper below). The lobby brings its own calmer backdrop, and
          the round/match end screens bring the landing hero — rendering the
          table art under either just stacked two full-bleed backgrounds at the
          same depth. */}
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-uno-red text-uno-cream text-center text-sm font-semibold py-1">
          reconnecting…
        </div>
      )}
      {view.phase === "lobby" && <Lobby view={view} send={send} />}
      {shownPhase === "in_round" && (
        // One fixed, viewport-sized wrapper so the outro fade has something to
        // animate WITHOUT becoming the containing block for the tables' own
        // `fixed inset-0` (an opacity < 1 on a static wrapper would collapse
        // them onto a zero-height box).
        <div className={`fixed inset-0 ${exiting ? "table-outro" : ""}`}>
          <RoomBackground isPhone={isPhone} />
          {isPhone ? (
            <MobileGameTable view={view} send={send} />
          ) : (
            <GameTable view={view} send={send} />
          )}
        </div>
      )}
      {(shownPhase === "round_end" || shownPhase === "match_end") && (
        <RoundEnd view={view} send={send} />
      )}
      <Toasts />
    </>
  );
}

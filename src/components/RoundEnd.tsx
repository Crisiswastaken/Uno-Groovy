"use client";

import type { ClientView } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";

export function RoundEnd({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const isHost = view.hostPlayerId === view.youPlayerId;
  const isMatchEnd = view.phase === "match_end";
  const winnerId = isMatchEnd ? view.matchWinnerId : view.roundWinnerId;
  const winner = view.players.find((p) => p.playerId === winnerId);
  const showScores = view.config.scoringMode === "targetScore";

  const ranked = [...view.players].sort(
    (a, b) => (view.scores[b.playerId] ?? 0) - (view.scores[a.playerId] ?? 0),
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="bg-uno-white1 border-2 border-uno-ink/10 rounded-card p-8 w-full max-w-md text-center">
        <div className="text-uno-ink1 text-sm font-bold uppercase tracking-widest mb-2">
          {isMatchEnd ? "Match Over" : "Round Over"}
        </div>
        <h1 className="font-display text-5xl mb-6">
          {winner ? `${winner.displayName} wins!` : "Round complete"}
        </h1>

        {showScores && (
          <div className="flex flex-col gap-2 mb-6">
            {ranked.map((p, i) => (
              <div
                key={p.playerId}
                className="flex justify-between items-center bg-uno-cream border-2 border-uno-ink/10 rounded-card px-4 py-2.5"
              >
                <span className="font-semibold flex items-center gap-1.5">
                  {i === 0 && <Trophy />}
                  {p.displayName}
                </span>
                <span className="font-bold tabular-nums">
                  {view.scores[p.playerId] ?? 0}
                  <span className="text-uno-ink2 text-xs font-medium">
                    {" "}
                    / {view.config.targetScore}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {isHost ? (
          <button
            onClick={() => send({ type: "startNextRound" })}
            className="w-full bg-uno-green text-uno-cream font-extrabold uppercase tracking-wide py-3.5 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none transition"
          >
            {isMatchEnd ? "New Match" : "Next Round"}
          </button>
        ) : (
          <div className="text-uno-ink1 py-3">
            Waiting for host to continue…
          </div>
        )}
      </div>
    </main>
  );
}

/** Winner's mark on the leaderboard — replaces the old 🏆 emoji. */
function Trophy() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0 text-uno-yellow drop-shadow-[0_1px_1px_rgba(43,42,39,0.25)]"
    >
      <path d="M19 4h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1H5a1 1 0 0 0-1 1v2a4 4 0 0 0 4 4h.28A5 5 0 0 0 11 13.9V17H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.1A5 5 0 0 0 15.72 11H16a4 4 0 0 0 4-4V5a1 1 0 0 0-1-1ZM6 7V6h1v3a2 2 0 0 1-1-2Zm13 0a2 2 0 0 1-1 2V6h1v1Z" />
    </svg>
  );
}

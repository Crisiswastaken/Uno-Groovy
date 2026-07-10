"use client";

import type { ClientView } from "../engine/types";
import { DEFAULT_CONFIG } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";
import { ColorPicker } from "./ColorPicker";
import { GameTable } from "./GameTable";
import { Lobby } from "./Lobby";
import { NameGate } from "./NameGate";
import { RoundEnd } from "./RoundEnd";
import { Spinner } from "./ui/Spinner";

/* --------------------------------------------------------------------------
   DEMO PART RENDERER

   Renders a single real component full-screen with mock data, keyed by a
   route slug (/demo/part/[c]). The component gallery (/demo/components) frames
   each of these in an iframe so their fixed / min-h-screen layouts render
   exactly as they do in-game, in isolation.

   Nothing here is new UI — every case renders the actual shipping component
   (or the exact RoomClient connection-state markup) so what you review is what
   the game uses.
-------------------------------------------------------------------------- */

const noop = (_m: ClientMessage) => {};

type PlayerView = ClientView["players"][number];

const player = (over: Partial<PlayerView> & Pick<PlayerView, "playerId" | "displayName" | "seat">): PlayerView => ({
  handCount: 5,
  hasCalledUno: false,
  connected: true,
  isCatchable: false,
  ...over,
});

const ROSTER: PlayerView[] = [
  // p1 is the local player; the "(you)" marker comes from ID matching, so a real
  // name here keeps end screens grammatical ("Ana wins!", not "You wins!").
  player({ playerId: "p1", displayName: "Ana", seat: 0, handCount: 4 }),
  player({ playerId: "p2", displayName: "Maya", seat: 1, handCount: 3 }),
  player({ playerId: "p3", displayName: "Leo", seat: 2, handCount: 7 }),
];

function view(over: Partial<ClientView>): ClientView {
  return {
    roomCode: "WXYZ",
    youPlayerId: "p1",
    hostPlayerId: "p1",
    config: DEFAULT_CONFIG,
    phase: "lobby",
    players: ROSTER,
    yourHand: [],
    drawPileCount: 60,
    discardTop: null,
    activeColor: null,
    direction: 1,
    currentSeat: 0,
    pendingDraw: 0,
    pendingPass: null,
    scores: { p1: 210, p2: 130, p3: 90 },
    roundWinnerId: null,
    matchWinnerId: null,
    lastActionLog: [],
    ...over,
  };
}

/** Centered loader state, matching RoomClient's pre-view screens. */
function ConnState({ label }: { label: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <div className="text-center">
          <div className="text-uno-ink1 font-medium">{label}</div>
          <div className="text-xs text-uno-ink2 mt-1 tracking-widest">WXYZ</div>
        </div>
      </div>
    </main>
  );
}

/** Static, persistent copy of the Toasts stack (the live one auto-dismisses). */
function ToastsPreview() {
  return (
    <main className="min-h-screen relative">
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <div className="px-4 py-2 rounded-card border-2 text-sm font-semibold bg-uno-cream text-uno-ink border-uno-ink/15">
          Leo played a Reverse
        </div>
        <div className="px-4 py-2 rounded-card border-2 text-sm font-semibold bg-uno-red text-uno-cream border-uno-ink/15">
          You can&apos;t play that card
        </div>
      </div>
    </main>
  );
}

export function PartView({ name }: { name: string }) {
  switch (name) {
    case "namegate":
      return <NameGate code="WXYZ" onSubmit={() => {}} />;

    case "connecting":
      return <ConnState label="Connecting…" />;
    case "entering":
      return <ConnState label="Entering room…" />;

    case "reconnecting":
      return (
        <>
          <div className="fixed top-0 inset-x-0 z-50 bg-uno-red text-uno-cream text-center text-sm font-semibold py-1">
            reconnecting…
          </div>
          <Lobby view={view({ phase: "lobby" })} send={noop} />
        </>
      );

    case "lobby-host":
      return <Lobby view={view({ phase: "lobby" })} send={noop} />;
    case "lobby-guest":
      return <Lobby view={view({ phase: "lobby", youPlayerId: "p2" })} send={noop} />;

    case "colorpicker":
      return (
        <main className="min-h-screen">
          <ColorPicker onPick={() => {}} onCancel={() => {}} />
        </main>
      );

    case "roundend-round":
      return (
        <RoundEnd
          view={view({
            phase: "round_end",
            roundWinnerId: "p2",
            config: { ...DEFAULT_CONFIG, scoringMode: "singleRound" },
          })}
          send={noop}
        />
      );
    case "roundend-scores":
      return (
        <RoundEnd
          view={view({
            phase: "round_end",
            roundWinnerId: "p1",
            config: { ...DEFAULT_CONFIG, scoringMode: "targetScore", targetScore: 500 },
          })}
          send={noop}
        />
      );
    case "roundend-match":
      return (
        <RoundEnd
          view={view({
            phase: "match_end",
            matchWinnerId: "p1",
            config: { ...DEFAULT_CONFIG, scoringMode: "targetScore", targetScore: 500 },
          })}
          send={noop}
        />
      );

    case "gametable": {
      // Live in-round board with a full roster (left/top/right seats), a
      // playable hand on your turn, an active color, and a catchable opponent.
      const roster: PlayerView[] = [
        player({ playerId: "p1", displayName: "Ana", seat: 0, handCount: 6 }),
        player({ playerId: "p2", displayName: "Maya", seat: 1, handCount: 3 }),
        player({ playerId: "p3", displayName: "Leo", seat: 2, handCount: 7 }),
        player({ playerId: "p4", displayName: "Sam", seat: 3, handCount: 1, isCatchable: true }),
      ];
      // A red 5 + blue 5 to exercise the Stacking selection (both are openers
      // against a 5 on top), plus a wild and spare cards.
      const hand: ClientView["yourHand"] = [
        { uid: "h1", color: "red", value: "5" },
        { uid: "h2", color: "blue", value: "5" },
        { uid: "h3", color: "yellow", value: "3" },
        { uid: "h4", color: null, value: "wild_draw4" },
        { uid: "h5", color: "green", value: "6" },
        { uid: "h6", color: "red", value: "8" },
      ];
      return (
        <GameTable
          view={view({
            phase: "in_round",
            players: roster,
            currentSeat: 0,
            activeColor: "green",
            discardTop: { uid: "d0", color: "green", value: "5" },
            yourHand: hand,
            pendingDraw: 0,
            config: { ...DEFAULT_CONFIG, stacking: true },
            lastActionLog: [{ id: "a1", text: "Leo played a green 5", seat: 2 }],
          })}
          send={noop}
        />
      );
    }

    case "toasts":
      return <ToastsPreview />;

    default:
      return (
        <main className="min-h-screen flex items-center justify-center text-uno-ink2">
          Unknown part: {name}
        </main>
      );
  }
}

import Link from "next/link";

/* --------------------------------------------------------------------------
   COMPONENT GALLERY  (/demo/components)

   Every real, shipping component rendered in its own isolated device frame so
   the whole surface — popups, lobby, end screens, connection states — can be
   reviewed in one scroll without playing a full game to reach each one. Each
   frame is a same-origin iframe (to /demo/part/[c] or a real route) so the
   component's own fixed / min-h-screen layout renders exactly as in-game.

   Scratch review page — remove once the components are finalized.
-------------------------------------------------------------------------- */

type Item = { label: string; note?: string; src: string; w: number; h: number };
type Section = { title: string; blurb: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Entry",
    blurb: "The screens a player meets before the table — landing, room setup, name, connecting.",
    items: [
      { label: "Landing", note: "app route: /", src: "/", w: 900, h: 560 },
      { label: "Create room", note: "house rules form · /create", src: "/create", w: 440, h: 880 },
      { label: "Name gate", note: "joining via invite link", src: "/demo/part/namegate", w: 420, h: 540 },
      { label: "Connecting", note: "socket not yet open", src: "/demo/part/connecting", w: 420, h: 320 },
      { label: "Entering room", note: "connected, awaiting first view", src: "/demo/part/entering", w: 420, h: 320 },
    ],
  },
  {
    title: "Lobby",
    blurb: "Pre-game room. Host sees Start; guests wait. The reconnect banner rides on top when the socket drops.",
    items: [
      { label: "Lobby — host", note: "start enabled at 2+", src: "/demo/part/lobby-host", w: 440, h: 880 },
      { label: "Lobby — guest", note: "waiting for host", src: "/demo/part/lobby-guest", w: 440, h: 880 },
      { label: "Reconnecting", note: "dropped-socket banner", src: "/demo/part/reconnecting", w: 440, h: 880 },
    ],
  },
  {
    title: "In-round popups",
    blurb: "Overlays that appear during play.",
    items: [
      { label: "Color picker", note: "after a wild is played", src: "/demo/part/colorpicker", w: 420, h: 560 },
      { label: "Toasts", note: "info + error, bottom-right", src: "/demo/part/toasts", w: 440, h: 320 },
    ],
  },
  {
    title: "Round & match end",
    blurb: "The between-rounds and final screens, with and without running scores.",
    items: [
      { label: "Round over", note: "single-round, no scoreboard", src: "/demo/part/roundend-round", w: 440, h: 560 },
      { label: "Round over — scores", note: "target-score scoreboard", src: "/demo/part/roundend-scores", w: 440, h: 680 },
      { label: "Match over", note: "final winner + scores", src: "/demo/part/roundend-match", w: 440, h: 700 },
    ],
  },
];

function Frame({ item }: { item: Item }) {
  return (
    <figure className="shrink-0">
      <figcaption className="mb-2">
        <div className="font-bold text-uno-ink leading-tight">{item.label}</div>
        {item.note && <div className="text-xs text-uno-ink2">{item.note}</div>}
      </figcaption>
      <div
        className="overflow-hidden rounded-[20px] border-2 border-uno-ink/12 bg-uno-cream shadow-[0_10px_30px_rgba(43,42,39,0.16)]"
        style={{ width: item.w }}
      >
        <iframe
          src={item.src}
          title={item.label}
          loading="lazy"
          width={item.w}
          height={item.h}
          className="block bg-uno-cream"
        />
      </div>
    </figure>
  );
}

export default function ComponentGallery() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <header className="max-w-5xl mb-10">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-uno-ink2 mb-2">
          Scratch · component review
        </div>
        <h1 className="font-display text-5xl md:text-6xl mb-3">Component gallery</h1>
        <p className="text-uno-ink1 max-w-2xl">
          Every shipping component in an isolated frame, so the whole surface can be reviewed in
          one place. Each frame is the real component with mock data — what you see is what the game
          renders. The game table itself lives on{" "}
          <Link href="/demo" className="font-semibold underline decoration-uno-red decoration-2 underline-offset-2">
            /demo
          </Link>
          .
        </p>
      </header>

      <div className="flex flex-col gap-14">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="font-display text-3xl">{section.title}</h2>
              <span className="h-px flex-1 bg-uno-ink/12" />
            </div>
            <p className="text-sm text-uno-ink2 mb-6 max-w-2xl">{section.blurb}</p>
            <div className="flex flex-wrap items-start gap-8">
              {section.items.map((item) => (
                <Frame key={item.label} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-16 text-xs text-uno-ink2">
        Scratch route — delete <code className="font-mono">/demo/components</code> and{" "}
        <code className="font-mono">/demo/part</code> once components are finalized.
      </footer>
    </main>
  );
}

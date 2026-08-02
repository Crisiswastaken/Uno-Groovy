"use client";

import { useState } from "react";
import { RoomQr } from "../../../components/RoomQr";
import { Card as Img } from "../../../components/ui/Card";
import { normalizeRoomCode, randomRoomCode } from "../../../lib/identity";

/**
 * Dev-only scratch route for the invite QR (`RoomQr`), so it can be tuned and
 * test-scanned on a real phone before it goes into `Lobby`. Nothing else
 * imports the component yet. Gated to development by /demo's layout.
 */
export default function QrDemoPage() {
  const [code, setCode] = useState("KRWXBM");
  const [size, setSize] = useState(220);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-6 py-12 px-4 overflow-hidden">
      <Img
        src="/home/background.png"
        alt=""
        fill
        rounded={false}
        priority
        sizes="100vw"
        className="object-cover -z-10 select-none pointer-events-none"
      />

      <div className="w-full max-w-md bg-uno-cream/80 backdrop-blur-2xl rounded-[28px] border-2 border-white/50 shadow-[0_20px_60px_rgba(43,42,39,0.25)] p-5 sm:p-6">
        <h1 className="font-display text-4xl mb-1">Invite QR</h1>
        <p className="text-sm text-uno-ink2 mb-5">
          Scan it at a few sizes. The QR needs a light surface behind it — its
          background is transparent, so the quiet zone is only quiet if what
          shows through is pale.
        </p>

        {/* The sunken panel the QR will actually sit on in the lobby. */}
        <div className="bg-uno-white1 border-2 border-uno-ink/10 rounded-card p-4 mb-5 grid place-items-center">
          <RoomQr roomCode={code} size={size} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest font-semibold text-uno-ink2">
              Room code
            </span>
            <input
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              className="font-display text-2xl tracking-[0.1em] bg-uno-white1 border-2 border-uno-ink/10 rounded-card px-4 py-2 outline-none focus:border-uno-ink/25"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest font-semibold text-uno-ink2">
              Size — {size}px
            </span>
            <input
              type="range"
              min={120}
              max={360}
              step={4}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="accent-uno-red"
            />
          </label>

          <button
            onClick={() => setCode(randomRoomCode())}
            className="text-sm font-semibold bg-uno-cream border-2 border-uno-ink/15 hover:bg-uno-white2 hover:border-uno-ink/25 hover:-translate-y-0.5 active:translate-y-0 rounded-full px-4 py-1.5 transition self-start"
          >
            Random code
          </button>
        </div>
      </div>
    </main>
  );
}

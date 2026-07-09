"use client";

import { useState } from "react";

export function NameGate({
  code,
  onSubmit,
}: {
  code: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-sm font-semibold text-uno-ink1">Joining room</div>
        <div className="font-display text-4xl tracking-[0.15em] mt-1">{code}</div>
      </div>
      <div className="flex flex-col gap-3 w-72">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
          className="bg-uno-white1 border-2 border-uno-ink/15 rounded-card px-4 py-3 outline-none placeholder:text-uno-ink2 hover:border-uno-ink/25 focus:border-uno-blue transition"
        />
        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="bg-uno-green text-uno-cream font-extrabold uppercase tracking-wide py-3 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:hover:brightness-100 transition"
        >
          Join
        </button>
      </div>
    </main>
  );
}

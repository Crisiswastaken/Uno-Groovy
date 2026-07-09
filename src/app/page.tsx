"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "../components/ui/Card";
import { setName } from "../lib/identity";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [mode, setMode] = useState<"home" | "join">("home");

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || !name.trim()) return;
    setName(c, name.trim());
    router.push(`/room/${c}`);
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-6">
      {/* Groovy background */}
      <Card
        src="/home/background.png"
        alt=""
        fill
        rounded={false}
        priority
        sizes="100vw"
        className="object-cover -z-10 select-none pointer-events-none"
      />

      {/* Decorative cards */}
      <Card
        src="/home/plus4.png"
        alt=""
        width={220}
        height={340}
        priority
        className="hidden md:block absolute left-[7%] top-[10%] w-[9rem] lg:w-[11rem] h-auto -rotate-6 drop-shadow-[0_10px_20px_rgba(43,42,39,0.28)] select-none pointer-events-none"
      />
      <Card
        src="/cards/wild.png"
        alt=""
        width={220}
        height={340}
        priority
        className="hidden md:block absolute left-[6%] bottom-[8%] w-[8.5rem] lg:w-[10.5rem] h-auto -rotate-3 drop-shadow-[0_10px_20px_rgba(43,42,39,0.28)] select-none pointer-events-none"
      />
      <Card
        src="/home/uno-back.png"
        alt=""
        width={220}
        height={340}
        priority
        className="hidden md:block absolute right-[7%] top-1/2 -translate-y-1/2 w-[9rem] lg:w-[11rem] h-auto rotate-6 drop-shadow-[0_10px_20px_rgba(43,42,39,0.28)] select-none pointer-events-none"
      />

      {/* Center column */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        <Card
          src="/home/uno-wordmark.png"
          alt="UNO"
          width={556}
          height={330}
          priority
          rounded={false}
          className="w-64 sm:w-80 h-auto drop-shadow-[0_8px_16px_rgba(43,42,39,0.25)] select-none"
        />

        {mode === "home" ? (
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={() => router.push("/create")}
              className="group flex items-center gap-4 bg-uno-red text-uno-cream rounded-card px-5 py-4 border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none transition"
            >
              <span className="grid place-items-center w-9 h-9 rounded-[12px] bg-uno-cream text-uno-red transition-transform group-hover:scale-110">
                <PlusIcon />
              </span>
              <span className="font-extrabold text-xl tracking-wide uppercase">
                Create Room
              </span>
            </button>
            <button
              onClick={() => setMode("join")}
              className="group flex items-center gap-4 bg-uno-blue text-uno-cream rounded-card px-5 py-4 border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none transition"
            >
              <span className="grid place-items-center w-9 h-9 rounded-[12px] bg-uno-cream text-uno-blue transition-transform group-hover:scale-110">
                <PeopleIcon />
              </span>
              <span className="font-extrabold text-xl tracking-wide uppercase">
                Join Room
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-sm bg-uno-cream/95 rounded-card border-2 border-uno-ink/15 p-5 shadow-[0_5px_0_rgba(43,42,39,0.2)]">
            <input
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              autoFocus
              className="bg-uno-white1 border-2 border-uno-ink/15 rounded-card px-4 py-3 outline-none text-uno-ink placeholder:text-uno-ink2 focus:border-uno-blue transition"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && join()}
              className="bg-uno-white1 border-2 border-uno-ink/15 rounded-card px-4 py-3 outline-none text-uno-ink placeholder:text-uno-ink2 focus:border-uno-blue tracking-[0.3em] uppercase transition"
            />
            <button
              onClick={join}
              disabled={code.trim().length < 4 || !name.trim()}
              className="bg-uno-green text-uno-cream font-extrabold text-lg tracking-wide uppercase rounded-card py-3 border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:hover:brightness-100 transition"
            >
              Join
            </button>
            <button
              onClick={() => setMode("home")}
              className="group flex items-center justify-center gap-1.5 text-uno-ink1 hover:text-uno-ink text-sm font-semibold mt-1 transition-colors"
            >
              <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3 0-6 1.5-6 4.2V19h12v-1.8C15 14.5 12 13 9 13Zm8 0c-.6 0-1.2.06-1.7.17 1.1.9 1.7 2.1 1.7 4v1.83h4V17.2C21 14.5 19 13 17 13Z" />
    </svg>
  );
}

function ArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

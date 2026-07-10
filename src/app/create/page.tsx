"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CONFIG, RuleConfig } from "../../engine/types";
import { randomRoomCode, stashCreate } from "../../lib/identity";

export default function CreatePage() {
  const router = useRouter();
  const [config, setConfig] = useState<RuleConfig>({ ...DEFAULT_CONFIG });

  const set = <K extends keyof RuleConfig>(k: K, v: RuleConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const create = () => {
    const code = randomRoomCode();
    // Only the rules travel with the room; the name is collected once, on the
    // room screen, for host and guests alike.
    stashCreate(code, { config });
    router.push(`/room/${code}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="font-display text-5xl mb-2">Create Room</h1>
        <p className="text-uno-ink1 text-sm mb-8">
          Set the house rules — you&apos;ll pick your name when the room opens.
        </p>

        <h2 className="text-lg font-bold mb-4">House Rules</h2>

        {/* Desktop-first: settings laid out as a two-column card grid. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleCard
            label="UNO call required"
            hint="Players at 1 card must call UNO"
            value={config.unoCall}
            onChange={(v) => set("unoCall", v)}
          />
          {config.unoCall ? (
            <NumberCard
              label="Missed-UNO penalty"
              hint="Cards drawn when caught"
              value={config.unoPenalty}
              min={1}
              max={10}
              onChange={(v) => set("unoPenalty", v)}
            />
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}

          <ToggleCard
            label="Stack +2 on +2"
            hint="Pass along an accumulating +2 penalty"
            value={config.stackDraw2OnDraw2}
            onChange={(v) => set("stackDraw2OnDraw2", v)}
          />
          <ToggleCard
            label="Stack +4 on +2 or +4"
            hint="+2 onto +4 stays forbidden"
            value={config.stackDraw4OnDraw2Or4}
            onChange={(v) => set("stackDraw4OnDraw2Or4", v)}
          />

          <ToggleCard
            label="Stacking"
            hint="Play multiple same number/symbol cards at once"
            value={config.stacking}
            onChange={(v) => set("stacking", v)}
          />

          <SelectCard
            label="Draw penalty"
            hint="What happens on a forced draw"
            value={config.drawPenaltyBehavior}
            options={[
              ["drawOneAndPass", "Draw one & pass"],
              ["drawUntilPlayable", "Draw until playable"],
            ]}
            onChange={(v) => set("drawPenaltyBehavior", v as RuleConfig["drawPenaltyBehavior"])}
          />
          <ToggleCard
            label="Force play"
            hint="Must play a drawn card if it's playable"
            value={config.forcePlay}
            onChange={(v) => set("forcePlay", v)}
          />

          <NumberCard
            label="Deal size"
            hint="Cards dealt to each player"
            value={config.dealSize}
            min={3}
            max={10}
            onChange={(v) => set("dealSize", v)}
          />
          <SelectCard
            label="Scoring"
            hint="How the match is won"
            value={config.scoringMode}
            options={[
              ["singleRound", "Single round"],
              ["targetScore", "Target score"],
            ]}
            onChange={(v) => set("scoringMode", v as RuleConfig["scoringMode"])}
          />

          {config.scoringMode === "targetScore" && (
            <NumberCard
              label="Target score"
              hint="First to reach it wins"
              value={config.targetScore}
              min={100}
              max={2000}
              step={50}
              onChange={(v) => set("targetScore", v)}
            />
          )}
        </div>

        <button
          onClick={create}
          className="w-full mt-8 bg-uno-red text-uno-cream font-extrabold uppercase tracking-wide py-3.5 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none transition"
        >
          Create &amp; Open Lobby
        </button>
        <button
          onClick={() => router.push("/")}
          className="group w-full mt-3 flex items-center justify-center gap-1.5 text-uno-ink1 hover:text-uno-ink text-sm font-semibold py-2 transition-colors"
        >
          <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
      </div>
    </main>
  );
}

/* --------------------------------------------------------------- Setting cards */

function SettingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-uno-white1 border-2 border-uno-ink/10 rounded-card px-4 py-3.5 ${className}`}
    >
      {children}
    </div>
  );
}

function Label({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <div className="font-semibold leading-tight">{label}</div>
      {hint && <div className="text-xs text-uno-ink2 mt-0.5">{hint}</div>}
    </div>
  );
}

function ToggleCard({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <SettingCard className="flex items-center justify-between gap-3">
      <Label label={label} hint={hint} />
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`shrink-0 w-14 h-8 rounded-full p-1 border-2 hover:brightness-105 transition ${
          value ? "bg-uno-green border-uno-ink/15" : "bg-uno-white2 border-uno-ink/10"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-uno-cream shadow-[0_1px_2px_rgba(43,42,39,0.3)] transition-transform ${
            value ? "translate-x-6" : ""
          }`}
        />
      </button>
    </SettingCard>
  );
}

function NumberCard({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <SettingCard className="flex items-center justify-between gap-3">
      <Label label={label} hint={hint} />
      <div className="flex items-center gap-2 shrink-0">
        <Stepper aria="decrease" onClick={() => onChange(clamp(value - step))}>
          <Minus />
        </Stepper>
        <span className="w-9 text-center font-bold tabular-nums">{value}</span>
        <Stepper aria="increase" onClick={() => onChange(clamp(value + step))}>
          <Plus />
        </Stepper>
      </div>
    </SettingCard>
  );
}

function Stepper({
  children,
  onClick,
  aria,
}: {
  children: React.ReactNode;
  onClick: () => void;
  aria: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="grid place-items-center w-8 h-8 rounded-[12px] bg-uno-cream border-2 border-uno-ink/15 text-uno-ink hover:bg-uno-white2 hover:border-uno-ink/30 active:scale-90 transition"
    >
      {children}
    </button>
  );
}

function SelectCard({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <SettingCard className="flex flex-col gap-2.5">
      <Label label={label} hint={hint} />
      <Dropdown value={value} options={options} onChange={onChange} />
    </SettingCard>
  );
}

/* ----------------------------------------------------------- Custom dropdown
   A real dropdown (not a native <select>) so the open option list is styled in
   the design system rather than the browser's default popup. */
function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(([v]) => v === value)?.[1] ?? "";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 30 : undefined }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 bg-uno-cream border-2 rounded-[14px] pl-3.5 pr-3 py-2.5 font-semibold text-uno-ink cursor-pointer transition ${
          open ? "border-uno-blue" : "border-uno-ink/15 hover:border-uno-ink/30"
        }`}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className={`shrink-0 text-uno-ink1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-[14px] border-2 border-uno-ink/15 bg-uno-cream shadow-[0_10px_28px_rgba(43,42,39,0.22)]"
        >
          {options.map(([v, l]) => {
            const selected = v === value;
            return (
              <li key={v}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left font-semibold transition-colors ${
                    selected ? "bg-uno-white1 text-uno-ink" : "text-uno-ink hover:bg-uno-white1"
                  }`}
                >
                  <span className="truncate">{l}</span>
                  {selected && <Check className="shrink-0 text-uno-blue" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- Icons */

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

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Plus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function Minus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

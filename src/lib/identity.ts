import { nanoid } from "nanoid";
import type { RuleConfig } from "../engine/types";

// Per-room client identity + host-create handoff, persisted in localStorage.

const pidKey = (code: string) => `uno:pid:${code}`;
const nameKey = (code: string) => `uno:name:${code}`;
const createKey = (code: string) => `uno:create:${code}`;

export function getOrCreatePlayerId(code: string): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(pidKey(code));
  if (!id) {
    id = nanoid(16);
    localStorage.setItem(pidKey(code), id);
  }
  return id;
}

export function getName(code: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(nameKey(code));
}

export function setName(code: string, name: string) {
  localStorage.setItem(nameKey(code), name);
}

export interface CreatePayload {
  config: RuleConfig;
}

export function stashCreate(code: string, payload: CreatePayload) {
  localStorage.setItem(createKey(code), JSON.stringify(payload));
}

export function takeCreate(code: string): CreatePayload | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(createKey(code));
  if (!raw) return null;
  localStorage.removeItem(createKey(code));
  try {
    return JSON.parse(raw) as CreatePayload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- Rule draft ---
   The /create form's settings, remembered across visits so a refresh (or a trip
   to a room and back) doesn't reset every house rule to the defaults. Distinct
   from stashCreate/takeCreate above, which is a one-shot handoff of the config
   to a specific room. */

const DRAFT_KEY = "uno:create:draft";

export function loadDraftConfig(): Partial<RuleConfig> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<RuleConfig>) : null;
  } catch {
    return null;
  }
}

export function saveDraftConfig(config: RuleConfig) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
  } catch {
    // storage full / blocked — the draft is a convenience, never load-bearing
  }
}

/**
 * A shareable room code. Letters only (A–Z minus the I/L/O lookalikes): the
 * lobby renders the code in Vodka Sans, the display face, which has no usable
 * digit or punctuation glyphs — so digits and separators came out as tofu.
 * 23^6 ≈ 148M combinations, ample for a party game with ephemeral rooms.
 */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 6;

export function randomRoomCode(): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

/** Coerce user input into a legal code: uppercase, letters only, length-capped. */
export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, ROOM_CODE_LENGTH);
}

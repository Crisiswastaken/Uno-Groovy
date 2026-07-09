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

export function randomRoomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

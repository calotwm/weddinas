import { createHash, randomInt } from "node:crypto";

// No 0/O, 1/I/L: codes are read aloud and typed from WhatsApp messages.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateAccessCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function normalizeAccessCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function hashAccessCode(input: string): string {
  return createHash("sha256").update(`weddinas:${normalizeAccessCode(input)}`).digest("hex");
}

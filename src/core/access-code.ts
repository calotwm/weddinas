import { createHash, randomInt } from "node:crypto";

// No 0/O, 1/I/L: codes are read aloud and typed from WhatsApp messages.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Random XXXX-XXXX code: the format couples got before easy codes, and the fallback when a name has no usable letters. */
export function generateAccessCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Uppercase letters and digits only, accents dropped ("Íñigo" -> "INIGO"). */
const lettersAndDigits = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/** Easy code the couple can remember: first names joined by "Y" plus the wedding year ("Delfi", "Juancho", 2027 -> DELFIYJUANCHO27). */
export function accessCodeFor(partnerA: string, partnerB: string, weddingDate: string): string {
  const first = (name: string) => lettersAndDigits(name.trim().split(/\s+/)[0] ?? "");
  const [a, b] = [first(partnerA), first(partnerB)];
  if (!a || !b) return generateAccessCode();
  return `${a}Y${b}${weddingDate.slice(2, 4)}`;
}

/** Case, space, symbol and accent insensitive; 8-character inputs keep the old XXXX-XXXX form so those codes still match. */
export function normalizeAccessCode(input: string): string {
  const raw = lettersAndDigits(input);
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function hashAccessCode(input: string): string {
  return createHash("sha256").update(`weddinas:${normalizeAccessCode(input)}`).digest("hex");
}

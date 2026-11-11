/**
 * WhatsApp click-to-chat: the team taps a button and WhatsApp opens with the message already written.
 * No API, no cost; sending stays a human tap.
 */

/** Buenos Aires has no daylight saving time. */
const BUENOS_AIRES_OFFSET = "-03:00";
const BUENOS_AIRES_OFFSET_MS = 3 * 60 * 60 * 1000;
/** Days after presenting a proposal and local hour of the reminder the agency asked for. */
export const REMINDER_DAYS = 2;
export const REMINDER_HOUR = "19:00";

/**
 * Digits in international format for wa.me. Argentine local numbers ("11 2233 4455", "011…", "+54 11…")
 * get the "549" mobile prefix. Empty input clears the number.
 */
export function normalizeWhatsapp(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `549${digits}`;
  else if (digits.length === 12 && digits.startsWith("54")) digits = `549${digits.slice(2)}`;
  if (digits.length < 8 || digits.length > 15) throw new Error("Invalid WhatsApp number");
  return digits;
}

/** Without a number WhatsApp asks which chat to send it to. */
export const whatsappLink = (phone: string | undefined, text: string) =>
  `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;

export const proposalMessage = (names: string, title: string, link: string) =>
  `¡Hola ${names}! Les dejamos una nueva propuesta en el portal: "${title}". La pueden ver acá: ${link}`;

export const reminderMessage = (names: string, title: string, link: string) =>
  `¡Hola ${names}! Les recordamos que tienen para ver la propuesta "${title}". Cuando puedan, nos cuentan qué les pareció: ${link}`;

export function monthTopicsMessage(names: string, monthLabel: string, topics: string[], overdue: string[], link: string): string {
  const bullets = (items: string[]) => items.map((t) => `• ${t}`);
  return [
    `¡Hola ${names}! Estos son los temas de ${monthLabel}:`,
    ...bullets(topics),
    ...(overdue.length ? ["", "Pendientes de meses anteriores:", ...bullets(overdue)] : []),
    "",
    `Los ven en el portal: ${link}`,
  ].join("\n");
}

/** True from 19:00 (Buenos Aires) of the second day after the proposal was presented. */
export function reminderDue(presentedAtIso: string, now: Date): boolean {
  const localDay = new Date(Date.parse(presentedAtIso) - BUENOS_AIRES_OFFSET_MS).toISOString().slice(0, 10);
  const reminderDay = new Date(Date.parse(`${localDay}T12:00:00Z`) + REMINDER_DAYS * 86_400_000).toISOString().slice(0, 10);
  return now.getTime() >= Date.parse(`${reminderDay}T${REMINDER_HOUR}:00${BUENOS_AIRES_OFFSET}`);
}

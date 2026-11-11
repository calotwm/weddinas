import type { AestheticWeb, WebItemChoice } from "./couple";

// Estética > Web: the agency's catalog of invitation-web choices. Ids are stored, so never rename them;
// labels are the agency's wording, shown as-is.

export interface WebChoice {
  id: string;
  label: string;
  /** The couple writes their own text for this choice. */
  custom?: boolean;
  hint?: string;
}

export interface WebItem {
  id: string;
  label: string;
  hint?: string;
  choices: WebChoice[];
}

export const MAX_WEB_CUSTOM = 500;

export const WEB_SAMPLES = [
  { option: 1, label: "Opción 1", url: "https://invitaciones.weddinas.com/clariymati/" },
  { option: 2, label: "Opción 2", url: "https://invitaciones.weddinas.com/luygaston/" },
  { option: 3, label: "Opción 3", url: "https://invitaciones.weddinas.com/evelynygabrieles/" },
  { option: 4, label: "Opción 4", url: "https://invitaciones.weddinas.com/anitayfran/" },
] as const;

const other = (label: string, hint?: string): WebChoice => ({ id: "other", label, custom: true, ...(hint ? { hint } : {}) });
const none: WebChoice = { id: "none", label: "Nada" };

export const WEB_ITEMS: WebItem[] = [
  {
    id: "welcome",
    label: "Bienvenida",
    choices: [
      { id: "ourWedding", label: "Nuestra boda" },
      { id: "ourMarriage", label: "Nuestro casamiento" },
      { id: "welcome", label: "Bienvenidos" },
      { id: "gettingMarried", label: "Nos casamos" },
      none,
      other("Otra opción (escribirla)"),
    ],
  },
  {
    id: "names",
    label: "Nombres",
    choices: [
      { id: "nicknames", label: "Apodo y Apodo" },
      { id: "firstNames", label: "Nombre y Nombre" },
      { id: "fullNames", label: "Nombre y apellido y Nombre y apellido" },
      other("Otra opción (Escribirla)"),
    ],
  },
  {
    id: "date",
    label: "Fecha",
    choices: [
      { id: "dots", label: "XX.XX.XX" },
      { id: "slashes", label: "XX/XX/XX" },
      { id: "pipes", label: "XX|XX|XX" },
      { id: "dashes", label: "XX-XX-XX" },
    ],
  },
  {
    id: "phrase",
    label: "Frase para la web",
    choices: [{ id: "write", label: "Escribir una frase que quieran", custom: true }, none],
  },
  {
    id: "dressCode",
    label: "Código de vestimenta",
    choices: [
      { id: "formal", label: "Formal" },
      { id: "informal", label: "Informal" },
      { id: "elegant", label: "Elegante" },
      { id: "smartCasual", label: "Elegante sport" },
      other("Otra opción", "Acá se puede profundizar en colores a utilizar, blanco exclusivo novia, recomendación de calzado"),
    ],
  },
  {
    id: "giftPhrase",
    label: "Frase regalos",
    choices: [
      { id: "gift", label: "Queres hacernos un regalo?" },
      { id: "honeymoon", label: "Nos ayudas con la luna de miel?" },
      other("Otra opción (Escribirla)"),
    ],
  },
  {
    id: "gifts",
    label: "Regalos",
    hint: "Aclarar cuentas, recomendamos cambiar el alias para que quede algo relacionado a la boda",
    choices: [
      { id: "pesosUsdEnvelope", label: "Cuenta en $ y dólares + Sobre el día del evento" },
      { id: "pesos", label: "Cuenta en $" },
      { id: "usd", label: "Cuenta en dólares" },
      none,
      other("Otra opción (escribirla)"),
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    choices: [{ id: "account", label: "Cuenta de la boda" }, { id: "hashtag", label: "Hashtag" }, none, other("Otra opción (Escribirla)")],
  },
  {
    id: "songs",
    label: "Canciones",
    choices: [
      { id: "spotify", label: "Poner link spotify" },
      { id: "rsvp", label: "Agregarlo en la parte de confirmación" },
      none,
      other("Otra opción (Escribirla)"),
    ],
  },
  {
    id: "message",
    label: "Mensaje a novios",
    choices: [{ id: "rsvp", label: "Agregarlo en la parte de confirmación" }, none, other("Otra opción (Escribirla)")],
  },
];

const DATE_SEPARATORS: Record<string, string> = { dots: ".", slashes: "/", pipes: "|", dashes: "-" };

/** The wedding date ("2027-02-08T18:00") as the chosen web format ("08.02.27"), or null when it cannot be shown. */
export function formatWebDate(weddingDate: string, choiceId: string): string | null {
  const sep = DATE_SEPARATORS[choiceId];
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(weddingDate);
  if (!sep || !match) return null;
  const [, year, month, day] = match;
  return [day, month, year.slice(2)].join(sep);
}

/** Validates a submitted selection: every choice must belong to its item; custom text is kept only on custom choices. */
export function cleanWebSelection(input: AestheticWeb): AestheticWeb {
  if (input.option !== null && !WEB_SAMPLES.some((s) => s.option === input.option)) throw new Error("Unknown web option");
  const choices: Record<string, WebItemChoice> = {};
  for (const [itemId, value] of Object.entries(input.choices)) {
    if (!value.choice) continue;
    const choice = WEB_ITEMS.find((i) => i.id === itemId)?.choices.find((c) => c.id === value.choice);
    if (!choice) throw new Error("Invalid web choice");
    choices[itemId] = { choice: choice.id, custom: choice.custom ? value.custom.trim().slice(0, MAX_WEB_CUSTOM) : "" };
  }
  return { option: input.option, choices };
}

/** What the guest page shows as dress code for this selection, or null to leave it as it is. */
export function webDressCode(web: AestheticWeb): string | null {
  const value = web.choices.dressCode;
  const choice = WEB_ITEMS.find((i) => i.id === "dressCode")!.choices.find((c) => c.id === value?.choice);
  if (!value || !choice) return null;
  return choice.custom ? value.custom : choice.label;
}

/** Reads the Web form: "webOption", plus "web-<item>" and "web-<item>-custom" per item. Validate with cleanWebSelection. */
export function readWebForm(form: { get(name: string): unknown }): AestheticWeb {
  const str = (name: string) => String(form.get(name) ?? "").trim();
  const option = str("webOption");
  const choices: Record<string, WebItemChoice> = {};
  for (const item of WEB_ITEMS) {
    const choice = str(`web-${item.id}`).slice(0, 40);
    if (choice) choices[item.id] = { choice, custom: str(`web-${item.id}-custom`).slice(0, MAX_WEB_CUSTOM) };
  }
  return { option: option ? Number(option) : null, choices };
}

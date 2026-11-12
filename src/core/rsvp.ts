// RSVP answers sent by the agency's Elementor invitation forms (webhook action).
// Elementor posts either "simple" pairs keyed by field label (or field id when the field has no label)
// or "advanced" pairs like fields[<id>][title] / fields[<id>][value]. Field ids are random per form,
// so fields are recognized by their label and, for the unlabeled attendance select, by its answer.

export interface RsvpAnswer {
  name: string;
  /** true "Sí, ahí estaré!", false "No podré asistir" / "No asistiré", null when the form has no attendance answer. */
  attending: boolean | null;
  menu: string;
  song: string;
  message: string;
}

export const RSVP_LIMITS = { name: 160, menu: 120, song: 300, message: 1000 } as const;

/** Lowercase, no accents, punctuation as spaces, single spaces. */
export const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ADVANCED = /^fields\[([^\]]+)\]\[(title|value)\]$/;
const META = /^(date|time|page url|user agent|remote ip|powered by|form id|form name|referer)$/;

function fieldsOf(entries: [string, string][]): { label: string; value: string }[] {
  const advanced = new Map<string, { title: string; value: string }>();
  const simple: { label: string; value: string }[] = [];
  for (const [key, value] of entries) {
    const match = ADVANCED.exec(key);
    if (match) {
      const field = advanced.get(match[1]) ?? { title: "", value: "" };
      field[match[2] as "title" | "value"] = value;
      advanced.set(match[1], field);
    } else if (!/^(form|meta)\[/.test(key)) {
      simple.push({ label: key, value });
    }
  }
  if (advanced.size) return [...advanced].map(([id, f]) => ({ label: f.title.trim() || id, value: f.value }));
  return simple.filter((f) => !META.test(plain(f.label)));
}

function attendanceOf(value: string): boolean | null {
  const answer = plain(value);
  if (/^no (podre|asistire|voy|puedo)\b/.test(answer) || answer === "no") return false;
  if (/^(si|ahi estare|asistire|confirmo|voy)\b/.test(answer)) return true;
  return null;
}

const clip = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);

export function parseRsvp(entries: [string, string][]): RsvpAnswer | null {
  const answer: RsvpAnswer = { name: "", attending: null, menu: "", song: "", message: "" };
  for (const { label, value } of fieldsOf(entries)) {
    const key = plain(label);
    if (/\bmenu\b/.test(key)) {
      if (attendanceOf(value) === false || plain(value) === "no asistire") answer.attending = false;
      else answer.menu = clip(value, RSVP_LIMITS.menu);
    } else if (/cancion/.test(key)) answer.song = clip(value, RSVP_LIMITS.song);
    else if (/mensaje/.test(key)) answer.message = clip(value, RSVP_LIMITS.message);
    else if (/\b(name|nombre)\b/.test(key) && !answer.name) answer.name = clip(value, RSVP_LIMITS.name);
    else if (answer.attending === null) answer.attending = attendanceOf(value);
  }
  return answer.name ? answer : null;
}

/** The one guest whose "name lastName" or "lastName name" equals the answer's name; null when none or several do. */
export function matchGuest<G extends { name: string; lastName?: string }>(guests: G[], name: string): G | null {
  const wanted = plain(name);
  if (!wanted) return null;
  const found = guests.filter((g) => {
    const last = g.lastName ?? "";
    return plain(`${g.name} ${last}`) === wanted || plain(`${last} ${g.name}`) === wanted;
  });
  return found.length === 1 ? found[0] : null;
}

/** Webhook body as key/value pairs: form-urlencoded as is, JSON flattened to Elementor's bracket keys; anything else is empty. */
export function rsvpBodyEntries(body: string, contentType: string): [string, string][] {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "application/x-www-form-urlencoded") return [...new URLSearchParams(body)];
  if (type !== "application/json") return [];
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }
  const entries: [string, string][] = [];
  const walk = (value: unknown, key: string, depth: number) => {
    if (depth > 4 || entries.length > 200) return;
    if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, key ? `${key}[${k}]` : k, depth + 1);
    } else if (key) entries.push([key, value === null || value === undefined ? "" : String(value)]);
  };
  walk(data, "", 0);
  return entries;
}

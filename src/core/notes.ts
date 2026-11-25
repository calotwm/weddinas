export interface NoteLine {
  kind: "heading" | "item";
  text: string;
}

const DASH = /^[-•*]\s*/;

/** Splits a planner's note into list items; a line ending in ":" or followed by dashed lines becomes a heading. */
export function noteLines(note: string): NoteLine[] {
  const lines = note.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const dashed = DASH.test(line);
    const nextDashed = DASH.test(lines[i + 1] ?? "");
    if (!dashed && (line.endsWith(":") || nextDashed)) return { kind: "heading", text: line.replace(/:$/, "").trim() };
    return { kind: "item", text: line.replace(DASH, "") };
  });
}

export interface NoteSegment {
  text: string;
  bold?: true;
  href?: string;
}

/** Catering's "Recepción" groups its bites as "Fríos" and "Calientes"; a line opening with either shows the word bold. */
const BOLD_LEAD = /^(fríos|frios|calientes)\b:?/i;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/** Splits one line of a note into plain text, its bold lead word and clickable web addresses. */
export function noteSegments(line: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let rest = line;
  const lead = BOLD_LEAD.exec(rest);
  if (lead) {
    segments.push({ text: lead[0], bold: true });
    rest = rest.slice(lead[0].length);
  }
  let at = 0;
  for (const match of rest.matchAll(URL)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    const start = match.index;
    if (start > at) segments.push({ text: rest.slice(at, start) });
    segments.push({ text: url, href: url.toLowerCase().startsWith("www.") ? `https://${url}` : url });
    at = start + url.length;
  }
  if (at < rest.length) segments.push({ text: rest.slice(at) });
  return segments;
}

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

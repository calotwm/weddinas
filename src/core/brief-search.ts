import type { BriefBlock } from "./couple";

/** Lowercase without accents, so "menu celiaco" finds "Menú celíaco". */
export const foldForSearch = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Everything the team may look for in a brief rubro: title, vendor, contact, owner, row names, details and notes. */
export function briefSearchText(block: BriefBlock): string {
  const parts = [block.name, block.vendor, block.contact, block.owner, ...block.fields.flatMap((f) => [f.label, f.detail, f.note])];
  return foldForSearch(parts.filter(Boolean).join("\n"));
}

/** True when every word of the query is in the (already folded) text; an empty query matches everything. */
export function matchesBriefSearch(foldedText: string, query: string): boolean {
  return foldForSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => foldedText.includes(word));
}

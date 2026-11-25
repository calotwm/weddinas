"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { matchesBriefSearch } from "@/core/brief-search";

/**
 * Filters the brief's rubros as the team types: rubros that don't match hide, matching ones open. Each rubro carries
 * its searchable text in `data-brief-search` (see briefSearchText), so the forms stay as they are.
 */
export function BriefSearch() {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const opened = useRef(new Set<HTMLDetailsElement>());

  useEffect(() => {
    const blocks = [...document.querySelectorAll<HTMLDetailsElement>("details[data-brief-search]")];
    const searching = query.trim() !== "";
    let count = 0;
    for (const el of blocks) {
      const match = matchesBriefSearch(el.dataset.briefSearch ?? "", query);
      el.hidden = !match;
      if (match) count++;
      if (searching && match && !el.open) {
        el.open = true;
        opened.current.add(el);
      } else if (!searching && opened.current.has(el)) {
        el.open = false;
      }
    }
    if (!searching) opened.current.clear();
    setShown(searching ? count : null);
  }, [query]);

  return (
    <div className="card flex flex-wrap items-center gap-3 !py-3">
      <Icon name="search" className="h-4 w-4 text-teal" />
      <label htmlFor="brief-search" className="sr-only">Buscar en el brief</label>
      <input
        id="brief-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar en el brief: rubro, proveedor, fila o texto"
        className="field min-w-0 flex-1 !py-2"
      />
      {shown !== null && (
        <p role="status" className="text-sm text-ink/60">
          {shown === 0 ? "Sin resultados" : `${shown} rubro${shown === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  );
}

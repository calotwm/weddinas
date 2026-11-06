"use client";

import { Icon } from "./icons";

/** Opens the browser print dialog, where "Guardar como PDF" downloads the page. Hidden on paper. */
export function PrintButton({ label = "Descargar PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary print:hidden">
      <Icon name="file" className="h-4 w-4" />
      {label}
    </button>
  );
}

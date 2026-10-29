"use client";

import { useState } from "react";
import { Icon } from "./icons";

export function CopyButton({
  text,
  label = "Copiar",
  copiedLabel = "¡Copiado!",
  className = "btn-ghost btn-sm",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá este texto:", text);
    }
  };

  return (
    <button type="button" onClick={copy} className={className}>
      <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
      {copied ? copiedLabel : label}
    </button>
  );
}

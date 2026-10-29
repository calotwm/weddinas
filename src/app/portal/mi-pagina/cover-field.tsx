"use client";

import { useState } from "react";
import { cssUrl } from "@/core/url";

export function CoverField({ defaultValue }: { defaultValue: string }) {
  const [url, setUrl] = useState(defaultValue);
  const preview = cssUrl(url);

  return (
    <div>
      <label htmlFor="coverImageUrl" className="label">Foto de portada (link)</label>
      <input
        id="coverImageUrl"
        name="coverImageUrl"
        type="url"
        maxLength={500}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className="field"
      />
      <p className="hint">Peguen el link de una foto horizontal (por ejemplo de Google Fotos o Instagram).</p>
      {preview !== "none" && (
        <div
          role="img"
          aria-label="Vista previa de la portada"
          className="mt-3 aspect-[16/7] rounded-2xl bg-sand bg-cover bg-center ring-1 ring-forest/10"
          style={{ backgroundImage: preview }}
        />
      )}
    </div>
  );
}

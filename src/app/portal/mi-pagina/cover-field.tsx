"use client";

import { useState } from "react";
import { cssUrl } from "@/core/url";

export function CoverField({ defaultValue }: { defaultValue: string }) {
  const [url, setUrl] = useState(defaultValue);
  const preview = cssUrl(url);

  return (
    <div>
      <label htmlFor="coverImageUrl" className="label">O peguen el link de una foto</label>
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
      <p className="hint">Si prefieren no subirla, sirve un link público a una foto horizontal.</p>
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

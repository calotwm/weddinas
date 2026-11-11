"use client";

import { useState } from "react";
import type { AestheticWeb, WebItemChoice } from "@/core/couple";
import { MAX_WEB_CUSTOM, WEB_ITEMS, WEB_SAMPLES, formatWebDate } from "@/core/web-options";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

/** Older couples wrote the dress code as free text: start from the matching preset, or "other" with that text. */
function initialChoices(web: AestheticWeb, dressCode: string): Record<string, WebItemChoice> {
  const choices = { ...web.choices };
  if (!choices.dressCode && dressCode) {
    const preset = WEB_ITEMS.find((i) => i.id === "dressCode")!.choices.find((c) => !c.custom && c.label === dressCode);
    choices.dressCode = preset ? { choice: preset.id, custom: "" } : { choice: "other", custom: dressCode };
  }
  return choices;
}

/** Estética Web: the sample web they like plus one dropdown per item, saved together. */
export function WebOptionsForm({
  web,
  dressCode,
  weddingDate,
  save,
  coupleId,
}: {
  web: AestheticWeb;
  /** The guest page's dress code, shown when no web choice was saved yet. */
  dressCode: string;
  weddingDate: string;
  save: (formData: FormData) => Promise<void>;
  /** Only for the team's action; the couple's comes from the session. */
  coupleId?: string;
}) {
  const [choices, setChoices] = useState(() => initialChoices(web, dressCode));
  const set = (itemId: string, patch: Partial<WebItemChoice>) =>
    setChoices((all) => ({ ...all, [itemId]: { ...(all[itemId] ?? { choice: "", custom: "" }), ...patch } }));

  return (
    <form action={save} className="space-y-6">
      {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
      <fieldset className="card space-y-3">
        <legend className="section-title">Opciones de web</legend>
        <p className="text-sm text-ink/60">Miren los modelos y elijan el que más les guste.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {WEB_SAMPLES.map((s) => (
            <li key={s.option} className="flex items-center justify-between gap-3 rounded-2xl p-3 ring-1 ring-forest/10">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="radio" name="webOption" value={s.option} defaultChecked={web.option === s.option} />
                {s.label}
              </label>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-forest underline">
                Ver web
              </a>
            </li>
          ))}
        </ul>
      </fieldset>

      <section className="card grid gap-5 sm:grid-cols-2">
        {WEB_ITEMS.map((item) => {
          const value = choices[item.id] ?? { choice: "", custom: "" };
          const picked = item.choices.find((c) => c.id === value.choice);
          const datePreview = item.id === "date" && picked ? formatWebDate(weddingDate, picked.id) : null;
          const selectId = `web-${item.id}`;
          return (
            <div key={item.id} className="space-y-2">
              <label htmlFor={selectId} className="label">{item.label}</label>
              {item.hint && <p className="hint">{item.hint}</p>}
              <select id={selectId} name={selectId} value={value.choice} onChange={(e) => set(item.id, { choice: e.target.value })} className="field">
                <option value="">Elegir…</option>
                {item.choices.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {datePreview && <p className="hint">Con su fecha queda: {datePreview}</p>}
              {picked?.custom && (
                <>
                  <textarea
                    name={`${selectId}-custom`}
                    rows={2}
                    maxLength={MAX_WEB_CUSTOM}
                    value={value.custom}
                    onChange={(e) => set(item.id, { custom: e.target.value })}
                    aria-label={`${item.label}: texto`}
                    placeholder="Escríbanlo acá"
                    className="field"
                  />
                  {picked.hint && <p className="hint">{picked.hint}</p>}
                </>
              )}
            </div>
          );
        })}
      </section>

      <SubmitButton doneText="¡Guardado!">
        <Icon name="check" className="h-4 w-4" />
        Guardar web
      </SubmitButton>
    </form>
  );
}

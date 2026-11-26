"use client";
/* eslint-disable @next/next/no-img-element -- private uploads are served by our own authenticated route */

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Aesthetic } from "@/core/couple";
import { AutoSaveForm, saveEnclosingForm } from "../auto-save-form";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";
import { photoUrl } from "./family";

type Result = { error?: string; ok?: number } | null;

export interface AestheticActions {
  save: (formData: FormData) => Promise<void>;
  upload: (prev: Result, formData: FormData) => Promise<Result>;
  remove: (formData: FormData) => Promise<void>;
}

/** Hidden couple id for the team's actions; the couple's actions read it from the session instead. */
function CoupleField({ coupleId }: { coupleId?: string }) {
  return coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;
}

let nextKey = 0;
const withKey = (c: { name: string; hex: string }) => ({ ...c, key: nextKey++ });

/** Colors as a swatch plus its number (hex); adding or removing one saves the form right away. */
function PaletteEditor({ initial }: { initial: Aesthetic["palette"] }) {
  const [colors, setColors] = useState(() => initial.map(withKey));
  const box = useRef<HTMLDivElement>(null);
  const listChanged = useRef(false);
  const setHex = (key: number, hex: string) => setColors((list) => list.map((c) => (c.key === key ? { ...c, hex } : c)));
  const changeList = (change: (list: typeof colors) => typeof colors) => {
    listChanged.current = true;
    setColors(change);
  };

  useEffect(() => {
    if (!listChanged.current) return;
    listChanged.current = false;
    saveEnclosingForm(box.current);
  }, [colors]);

  return (
    <div ref={box} className="space-y-3">
      {colors.length === 0 && <p className="text-sm text-ink/50">Todavía no hay colores cargados.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {colors.map((c, i) => (
          <li key={c.key} className="flex items-center gap-3 rounded-2xl p-2 ring-1 ring-forest/10">
            <input
              type="color"
              name="paletteHex"
              value={c.hex}
              onChange={(e) => setHex(c.key, e.target.value)}
              aria-label={`Color ${i + 1}`}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0"
            />
            {/* Names are no longer edited; a stored one rides along so a save does not erase it. */}
            <input type="hidden" name="paletteName" value={c.name} />
            <span className="min-w-0 flex-1 font-mono text-sm text-ink/70 uppercase">{c.hex}</span>
            <button type="button" className="btn-icon" onClick={() => changeList((list) => list.filter((x) => x.key !== c.key))}>
              <Icon name="trash" className="h-4 w-4" />
              <span className="sr-only">Quitar color {i + 1}</span>
            </button>
          </li>
        ))}
      </ul>
      {colors.length < 24 && (
        <button type="button" className="btn-ghost btn-sm" onClick={() => changeList((list) => [...list, withKey({ name: "", hex: "#9caf88" })])}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          Sumar color
        </button>
      )}
    </div>
  );
}

/** Estética General: fonts, palette and ideas, saved together as they change (photos upload on their own). */
export function AestheticForm({
  aesthetic,
  save,
  coupleId,
}: {
  aesthetic: Aesthetic;
  save: AestheticActions["save"];
  coupleId?: string;
}) {
  return (
    <AutoSaveForm save={save} className="space-y-6">
      <CoupleField coupleId={coupleId} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-5">
          <div>
            <label htmlFor="ae-title-font" className="label">Tipografía títulos</label>
            {/* Older couples wrote all their fonts in one text; it shows here until the next save moves it. */}
            <textarea id="ae-title-font" name="titleFont" rows={2} maxLength={1000} defaultValue={aesthetic.titleFont || aesthetic.fonts} placeholder="Ej: Playfair Display" className="field" />
          </div>
          <div>
            <label htmlFor="ae-body-font" className="label">Tipografía textos</label>
            <textarea id="ae-body-font" name="bodyFont" rows={2} maxLength={1000} defaultValue={aesthetic.bodyFont ?? ""} placeholder="Ej: Lora" className="field" />
            <p className="hint">Nombres de tipografías o links a ejemplos que les gusten.</p>
          </div>
          <div>
            <label htmlFor="ae-ideas" className="label">Ideas</label>
            <textarea id="ae-ideas" name="ideas" rows={4} maxLength={4000} defaultValue={aesthetic.ideas ?? ""} placeholder="Ej: mucho verde, flores blancas, mesas largas…" className="field" />
            <p className="hint">Abajo pueden sumar fotos de inspiración.</p>
          </div>
        </section>
        <section className="card space-y-4">
          <div>
            <h3 className="section-title">Colores</h3>
            <p className="text-sm text-ink/60">Elijan cada color; se guarda con su número, como referencia para deco y elementos gráficos.</p>
          </div>
          <PaletteEditor initial={aesthetic.palette} />
        </section>
      </div>
    </AutoSaveForm>
  );
}

function PickButton({ inputId }: { inputId: string }) {
  const { pending } = useFormStatus();
  return (
    <label htmlFor={inputId} aria-disabled={pending} className={`btn-ghost btn-sm cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <Icon name="plus" className="h-3.5 w-3.5" />
      {pending ? "Subiendo…" : "Subir fotos"}
    </label>
  );
}

/** Photos of the couple: grid with remove buttons plus a multi-file upload that starts as soon as photos are picked. */
export function AestheticPhotos({
  coupleId,
  photoIds,
  upload,
  remove,
  sendCoupleId = false,
  max,
}: {
  coupleId: string;
  photoIds: string[];
  upload: AestheticActions["upload"];
  remove: AestheticActions["remove"];
  /** True for the team's actions, which take the couple from the form. */
  sendCoupleId?: boolean;
  max: number;
}) {
  const [state, action] = useActionState(upload, null);
  const inputId = `aesthetic-photos-${coupleId}`;
  const formCouple = sendCoupleId ? coupleId : undefined;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">Ideas: fotos de inspiración</h3>
          <p className="text-sm text-ink/60">Fotos de los novios o de ideas que les gusten. Solo las ven la pareja y el equipo Weddinas · {photoIds.length} de {max}.</p>
        </div>
        {photoIds.length < max && (
          <form action={action} className="flex flex-col items-end gap-1">
            <CoupleField coupleId={formCouple} />
            <PickButton inputId={inputId} />
            <input
              id={inputId}
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
          </form>
        )}
      </div>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      {photoIds.length === 0 ? (
        <p className="text-sm text-ink/50">Todavía no hay fotos. JPG, PNG o WebP de hasta 5 MB cada una.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photoIds.map((id, i) => (
            <li key={id} className="group relative">
              <a href={photoUrl(coupleId, id)} target="_blank" rel="noreferrer">
                <img src={photoUrl(coupleId, id)} alt={`Foto de inspiración ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover ring-1 ring-forest/10" />
              </a>
              <form action={remove} className="absolute top-2 right-2">
                <CoupleField coupleId={formCouple} />
                <input type="hidden" name="photoId" value={id} />
                <SubmitButton className="btn-icon bg-white/90 shadow-soft" pendingText="…" confirm="¿Quitar esta foto?">
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Quitar foto {i + 1}</span>
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Read-only palette swatches, e.g. for summaries. */
export function PaletteSwatches({ palette }: { palette: Aesthetic["palette"] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {palette.map((c, i) => (
        <li key={`${c.hex}-${i}`} className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm ring-1 ring-forest/10">
          <span className="h-6 w-6 rounded-full ring-1 ring-forest/10" style={{ backgroundColor: c.hex }} aria-hidden />
          <span className="font-mono uppercase">{c.hex}</span>
        </li>
      ))}
    </ul>
  );
}

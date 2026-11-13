"use client";
/* eslint-disable @next/next/no-img-element -- private uploads are served by our own authenticated route */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";
import { photoUrl } from "./family";

// Files the team uploads for the couple to see (Papelería, timing image, Planos, cover photo).
// Without `edit` they render read-only, which is how the couple sees them.

type Result = { error?: string; ok?: number } | null;

const IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const DOCUMENT_TYPES = `${IMAGE_TYPES},application/pdf`;

const isPdf = (fileId: string) => fileId.endsWith(".pdf");

function HiddenFields({ fields }: { fields: Record<string, string> }) {
  return Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}

function PickButton({ inputId, label }: { inputId: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <label htmlFor={inputId} aria-disabled={pending} className={`btn-ghost btn-sm cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
      <Icon name="plus" className="h-3.5 w-3.5" />
      {pending ? "Subiendo…" : label}
    </label>
  );
}

/** A form that uploads as soon as a file is picked. */
function UploadForm({
  action,
  inputId,
  inputName,
  accept,
  multiple = false,
  label,
  fields,
}: {
  action: (formData: FormData) => void;
  inputId: string;
  inputName: string;
  accept: string;
  multiple?: boolean;
  label: string;
  fields: Record<string, string>;
}) {
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <HiddenFields fields={fields} />
      <PickButton inputId={inputId} label={label} />
      <input
        id={inputId}
        name={inputName}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}

export interface TeamFileEdit {
  upload: (prev: Result, formData: FormData) => Promise<Result>;
  remove: (formData: FormData) => Promise<void>;
  /** Hidden fields both forms send (coupleId, slot). */
  fields: Record<string, string>;
  /** Name of the file input the upload action reads. */
  inputName: string;
  /** "document" also takes a PDF. */
  accept: "image" | "document";
}

/** One file slot: an image preview or a PDF link; the team can upload, replace and remove it. */
export function TeamFileCard({
  title,
  description,
  coupleId,
  fileId,
  emptyText,
  edit,
}: {
  title: string;
  description?: string;
  coupleId: string;
  fileId: string | null;
  emptyText: string;
  edit?: TeamFileEdit;
}) {
  const [state, action] = useActionState(edit?.upload ?? (async () => null), null);
  const inputId = `team-file-${coupleId}-${title.replace(/\W+/g, "-")}`;
  const hint = edit?.accept === "document" ? "Imagen (JPG, PNG, WebP, hasta 5 MB) o PDF (hasta 10 MB)." : "JPG, PNG o WebP de hasta 5 MB.";

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">{title}</h3>
          {description && <p className="text-sm text-ink/60">{description}</p>}
        </div>
        {edit && (
          <UploadForm
            action={action}
            inputId={inputId}
            inputName={edit.inputName}
            accept={edit.accept === "document" ? DOCUMENT_TYPES : IMAGE_TYPES}
            label={fileId ? "Reemplazar" : "Subir"}
            fields={edit.fields}
          />
        )}
      </div>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      {!fileId ? (
        <p className="text-sm text-ink/50">{edit ? `Todavía no subiste nada. ${hint}` : emptyText}</p>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          {isPdf(fileId) ? (
            <a href={photoUrl(coupleId, fileId)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <Icon name="file" className="h-4 w-4" />
              Ver PDF
            </a>
          ) : (
            <a href={photoUrl(coupleId, fileId)} target="_blank" rel="noreferrer" className="block w-full">
              <img src={photoUrl(coupleId, fileId)} alt={title} className="max-h-[32rem] w-full rounded-2xl object-contain ring-1 ring-forest/10" />
            </a>
          )}
          {edit && (
            <form action={edit.remove}>
              <HiddenFields fields={edit.fields} />
              <SubmitButton className="btn-ghost btn-sm" pendingText="Quitando…" confirm={`¿Quitar «${title}»?`}>
                <Icon name="trash" className="h-4 w-4" />
                Quitar
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export interface TeamGalleryEdit {
  upload: (prev: Result, formData: FormData) => Promise<Result>;
  remove: (formData: FormData) => Promise<void>;
}

/** Several images (Papelería): a grid the couple sees; the team adds images in batches and removes them. */
export function TeamImageGallery({
  title,
  description,
  coupleId,
  fileIds,
  max,
  emptyText,
  edit,
}: {
  title: string;
  description: string;
  coupleId: string;
  fileIds: string[];
  max: number;
  emptyText: string;
  edit?: TeamGalleryEdit;
}) {
  const [state, action] = useActionState(edit?.upload ?? (async () => null), null);
  const inputId = `team-gallery-${coupleId}-${title.replace(/\W+/g, "-")}`;
  const fields = { coupleId };

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="text-sm text-ink/60">
            {description}
            {edit && ` · ${fileIds.length} de ${max}.`}
          </p>
        </div>
        {edit && fileIds.length < max && (
          <UploadForm action={action} inputId={inputId} inputName="photos" accept={IMAGE_TYPES} multiple label="Subir diseños" fields={fields} />
        )}
      </div>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      {fileIds.length === 0 ? (
        <p className="text-sm text-ink/50">{edit ? "Todavía no subiste diseños. JPG, PNG o WebP de hasta 5 MB cada uno." : emptyText}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fileIds.map((id, i) => (
            <li key={id} className="group relative">
              <a href={photoUrl(coupleId, id)} target="_blank" rel="noreferrer">
                <img src={photoUrl(coupleId, id)} alt={`${title} ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover ring-1 ring-forest/10" />
              </a>
              {edit && (
                <form action={edit.remove} className="absolute top-2 right-2">
                  <HiddenFields fields={{ ...fields, fileId: id }} />
                  <SubmitButton className="btn-icon bg-white/90 shadow-soft" pendingText="…" confirm="¿Quitar este diseño?">
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sr-only">Quitar diseño {i + 1}</span>
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Team only: the link to the team's timing spreadsheet. */
export function TimingSheetLinkForm({
  coupleId,
  url,
  save,
}: {
  coupleId: string;
  url: string;
  save: (prev: Result, formData: FormData) => Promise<Result>;
}) {
  const [state, action] = useActionState(save, null);
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">Excel del timing</h3>
          <p className="text-sm text-ink/60">El link a tu Excel de timing. Solo lo ve el equipo.</p>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
            <Icon name="external" className="h-4 w-4" />
            Abrir Excel
          </a>
        )}
      </div>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="coupleId" value={coupleId} />
        <div className="min-w-0 flex-1">
          <label htmlFor={`timing-sheet-${coupleId}`} className="label">Link</label>
          <input
            id={`timing-sheet-${coupleId}`}
            name="url"
            type="url"
            maxLength={2000}
            defaultValue={url}
            placeholder="https://docs.google.com/spreadsheets/…"
            className="field"
          />
        </div>
        <SubmitButton className="btn-primary btn-sm" doneText="¡Guardado!">
          <Icon name="check" className="h-4 w-4" />
          Guardar link
        </SubmitButton>
      </form>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      <p className="hint">Dejalo vacío y guardá para quitarlo.</p>
    </section>
  );
}

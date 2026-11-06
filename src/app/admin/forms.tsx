"use client";

import { useActionState, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { DEFAULT_WELCOME_TEMPLATE, renderWelcomeMessage, WELCOME_PLACEHOLDERS, WELCOME_TEMPLATE_MAX } from "@/core/welcome-message";
import {
  adminLogin,
  createCouple,
  importCoupleFile,
  regenerateCode,
  saveWelcomeTemplate,
  type FormResult,
} from "./actions";

/** The welcome message, built from the template the team edits at /admin/mensaje. */
const invitation = (names: string, code: string, origin: string, template = DEFAULT_WELCOME_TEMPLATE) =>
  renderWelcomeMessage(template, { nombres: names, link: origin, codigo: code });

function CodeNotice({ result, origin, names, template }: { result: FormResult; origin?: string; names?: string; template?: string }) {
  if (result?.error) return <p role="alert" className="rounded-xl bg-rust/10 px-3 py-2 text-sm text-rust">{result.error}</p>;
  if (!result?.code) return null;
  const who = result.names ?? names;
  return (
    <div role="status" className="space-y-3 rounded-2xl bg-peach-soft p-4 text-sm ring-1 ring-peach">
      {result.names && (
        <p className="flex items-center gap-2 font-semibold text-forest">
          <Icon name="check" className="h-4 w-4" />
          Pareja creada: {result.names}
        </p>
      )}
      <div>
        <p className="label">Código de acceso</p>
        <p className="font-display text-3xl tracking-[0.2em] text-forest">{result.code}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={result.code} label="Copiar código" />
        {origin && who && <CopyButton text={invitation(who, result.code, origin, template)} label="Copiar mensaje para enviar" />}
      </div>
      <p className="text-xs text-ink/60">Guardalo o enviáselo ahora: por seguridad no se vuelve a mostrar.</p>
    </div>
  );
}

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLogin, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="code" className="label">Código de administración</label>
        <input id="code" name="code" type="password" required autoComplete="current-password" className="field" />
      </div>
      <CodeNotice result={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="Entrando…">Entrar al panel</SubmitButton>
    </form>
  );
}

export function CreateCoupleForm({ origin, template }: { origin: string; template?: string }) {
  const [state, action] = useActionState(createCouple, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <label htmlFor="partnerA" className="label">Nombre 1</label>
          <input id="partnerA" name="partnerA" required maxLength={80} placeholder="Sofía" className="field" />
        </div>
        <div>
          <label htmlFor="partnerB" className="label">Nombre 2</label>
          <input id="partnerB" name="partnerB" required maxLength={80} placeholder="Martín" className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="weddingDate" className="label">Fecha y hora del casamiento</label>
        <input id="weddingDate" name="weddingDate" type="datetime-local" required className="field" />
      </div>
      <CodeNotice result={state} origin={origin} template={template} />
      <SubmitButton className="btn-primary w-full" pendingText="Creando…">
        <Icon name="plus" className="h-4 w-4" />
        Crear pareja
      </SubmitButton>
    </form>
  );
}

export function ImportCoupleForm({ origin, template }: { origin: string; template?: string }) {
  const [state, action] = useActionState(importCoupleFile, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="import-file" className="label">Archivo de la pareja (.json)</label>
        <input id="import-file" name="file" type="file" accept="application/json,.json" required className="field text-sm" />
      </div>
      <CodeNotice result={state} origin={origin} template={template} />
      <SubmitButton className="btn-ghost w-full" pendingText="Importando…">Importar pareja</SubmitButton>
    </form>
  );
}

export function RegenerateCodeForm({
  coupleId,
  names,
  origin,
  template,
}: {
  coupleId: string;
  names: string;
  origin: string;
  template?: string;
}) {
  const [state, action] = useActionState(regenerateCode, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="coupleId" value={coupleId} />
      <p className="text-sm text-ink/70">
        Los códigos se guardan cifrados, así que no se pueden ver. Si la pareja lo perdió, generá uno nuevo con sus nombres y el
        año (por ej. DELFIYJUANCHO27): el anterior deja de funcionar y se cierran sus sesiones abiertas.
      </p>
      <CodeNotice result={state} names={names} origin={origin} template={template} />
      <SubmitButton
        className="btn-ghost"
        pendingText="Generando…"
        confirm={`¿Generar un código nuevo para ${names}? El actual deja de funcionar.`}
      >
        <Icon name="key" className="h-4 w-4" />
        Generar nuevo código
      </SubmitButton>
    </form>
  );
}

const PREVIEW_VALUES = { nombres: "Delfi & Juancho", codigo: "DELFIYJUANCHO27" };

export function WelcomeTemplateForm({ template, origin }: { template: string; origin: string }) {
  const [state, action] = useActionState(saveWelcomeTemplate, null);
  const [text, setText] = useState(template);
  const isDefault = text.trim() === DEFAULT_WELCOME_TEMPLATE;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <label htmlFor="template" className="label">Mensaje</label>
        <textarea
          id="template"
          name="template"
          rows={9}
          maxLength={WELCOME_TEMPLATE_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field leading-relaxed"
        />
        <ul className="flex flex-wrap gap-2 text-xs text-ink/70">
          {WELCOME_PLACEHOLDERS.map((p) => (
            <li key={p.token}>
              <button
                type="button"
                onClick={() => setText((t) => (t && !/\s$/.test(t) ? `${t} ${p.token}` : `${t}${p.token}`))}
                className="chip cursor-pointer bg-peach-soft text-forest hover:bg-peach"
                title={`Agregar ${p.token}`}
              >
                <code>{p.token}</code> · {p.description}
              </button>
            </li>
          ))}
        </ul>
        {state?.error && <p role="alert" className="rounded-xl bg-rust/10 px-3 py-2 text-sm text-rust">{state.error}</p>}
        <div className="flex flex-wrap gap-2">
          <SubmitButton className="btn-primary" pendingText="Guardando…" doneText="¡Guardado!">Guardar mensaje</SubmitButton>
          {!isDefault && (
            <button type="submit" name="intent" value="reset" className="btn-ghost" onClick={() => setText(DEFAULT_WELCOME_TEMPLATE)}>
              Volver al texto original
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <p className="label">Así lo reciben</p>
        <p className="rounded-2xl bg-peach-soft p-4 text-sm whitespace-pre-line text-ink/85 ring-1 ring-peach">
          {renderWelcomeMessage(text, { ...PREVIEW_VALUES, link: origin })}
        </p>
        <p className="text-xs text-ink/55">Ejemplo con datos de prueba. Al crear una pareja o generar un código nuevo, el botón “Copiar mensaje para enviar” usa este texto.</p>
      </div>
    </form>
  );
}

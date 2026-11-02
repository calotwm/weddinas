"use client";

import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { adminLogin, createCouple, importCoupleFile, regenerateCode, type FormResult } from "./actions";

const invitation = (names: string, code: string, origin: string) =>
  `¡Hola ${names}! Este es su portal Weddinas, donde van a ver la cuenta regresiva, propuestas y reportes, y armar su página.\n\nEntren en ${origin} con el código: ${code}`;

function CodeNotice({ result, origin, names }: { result: FormResult; origin?: string; names?: string }) {
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
        {origin && who && <CopyButton text={invitation(who, result.code, origin)} label="Copiar mensaje para enviar" />}
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

export function CreateCoupleForm({ origin }: { origin: string }) {
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
      <CodeNotice result={state} origin={origin} />
      <SubmitButton className="btn-primary w-full" pendingText="Creando…">
        <Icon name="plus" className="h-4 w-4" />
        Crear pareja
      </SubmitButton>
    </form>
  );
}

export function ImportCoupleForm({ origin }: { origin: string }) {
  const [state, action] = useActionState(importCoupleFile, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="import-file" className="label">Archivo de la pareja (.json)</label>
        <input id="import-file" name="file" type="file" accept="application/json,.json" required className="field text-sm" />
      </div>
      <CodeNotice result={state} origin={origin} />
      <SubmitButton className="btn-ghost w-full" pendingText="Importando…">Importar pareja</SubmitButton>
    </form>
  );
}

export function RegenerateCodeForm({ coupleId, names, origin }: { coupleId: string; names: string; origin: string }) {
  const [state, action] = useActionState(regenerateCode, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="coupleId" value={coupleId} />
      <p className="text-sm text-ink/70">
        Los códigos se guardan cifrados, así que no se pueden ver. Si la pareja lo perdió, generá uno nuevo: el anterior deja de
        funcionar y se cierran sus sesiones abiertas.
      </p>
      <CodeNotice result={state} names={names} origin={origin} />
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

"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { adminLogin, createCouple, regenerateCode, type FormResult } from "./actions";

function CodeNotice({ result }: { result: FormResult }) {
  if (result?.error) return <p role="alert" className="text-sm text-rust">{result.error}</p>;
  if (!result?.code) return null;
  return (
    <div role="status" className="rounded-2xl bg-peach-soft p-4 text-sm">
      {result.names && <p className="mb-1 text-ink/70">Pareja creada: {result.names}</p>}
      <p>
        Código de acceso: <strong className="font-display text-xl tracking-[0.2em] text-forest">{result.code}</strong>
      </p>
      <p className="mt-1 text-ink/60">Copialo y pasáselo a la pareja: no se vuelve a mostrar.</p>
    </div>
  );
}

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLogin, null);
  return (
    <form action={action} className="space-y-4">
      <label htmlFor="code" className="label">Código de administración</label>
      <input id="code" name="code" type="password" required className="field" />
      <CodeNotice result={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Entrando…">Entrar</SubmitButton>
    </form>
  );
}

export function CreateCoupleForm() {
  const [state, action] = useActionState(createCouple, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="partnerA" className="label">Novia / novio</label>
          <input id="partnerA" name="partnerA" required className="field" />
        </div>
        <div>
          <label htmlFor="partnerB" className="label">Novia / novio</label>
          <input id="partnerB" name="partnerB" required className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="weddingDate" className="label">Fecha y hora</label>
        <input id="weddingDate" name="weddingDate" type="datetime-local" required className="field" />
      </div>
      <CodeNotice result={state} />
      <SubmitButton pendingText="Creando…">Crear pareja</SubmitButton>
    </form>
  );
}

export function RegenerateCodeForm({ coupleId }: { coupleId: string }) {
  const [state, action] = useActionState(regenerateCode, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="coupleId" value={coupleId} />
      <p className="text-sm text-ink/70">Genera un código nuevo. El anterior deja de funcionar.</p>
      <CodeNotice result={state} />
      <SubmitButton className="btn-ghost" pendingText="Generando…">Generar nuevo código</SubmitButton>
    </form>
  );
}

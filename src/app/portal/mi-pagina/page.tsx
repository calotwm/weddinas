import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { savePublicInfo } from "../actions";
import { getCurrentCouple } from "../data";
import { ScheduleEditor } from "./schedule-editor";

function Field({ name, label, defaultValue, placeholder, rows, type = "text" }: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  rows?: number;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {rows ? (
        <textarea id={name} name={name} rows={rows} defaultValue={defaultValue} placeholder={placeholder} className="field" />
      ) : (
        <input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="field" />
      )}
    </div>
  );
}

export default async function MyPage() {
  const couple = await getCurrentCouple();
  const info = couple.publicInfo;

  return (
    <form action={savePublicInfo} className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-5">
        <h2 className="font-display text-2xl text-forest">Lo que ven sus invitados</h2>
        <Field name="headline" label="Título" defaultValue={info.headline} placeholder="¡Nos casamos!" />
        <Field name="story" label="Nuestra historia" defaultValue={info.story} rows={5} placeholder="Cuéntenles cómo se conocieron…" />
        <Field name="coverImageUrl" label="Foto de portada (link)" type="url" defaultValue={info.coverImageUrl} placeholder="https://…" />
        <Field name="dressCode" label="Dress code" defaultValue={info.dressCode} placeholder="Elegante sport" />
        <Field name="giftInfo" label="Regalos" defaultValue={info.giftInfo} rows={3} placeholder="CBU, alias o lista de regalos" />
      </section>

      <section className="card space-y-5">
        <h2 className="font-display text-2xl text-forest">Dónde y cuándo</h2>
        <Field name="venue" label="Lugar" defaultValue={info.venue} placeholder="Estancia…" />
        <Field name="venueAddress" label="Dirección" defaultValue={info.venueAddress} />
        <Field name="mapUrl" label="Link a Google Maps" type="url" defaultValue={info.mapUrl} placeholder="https://maps.google.com/…" />
        <div>
          <span className="label">Cronograma del día</span>
          <ScheduleEditor initial={info.schedule} />
        </div>
        <p className="text-sm text-ink/60">La fecha la carga el equipo Weddinas. Si cambia, avísennos.</p>
      </section>

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <SubmitButton>Guardar cambios</SubmitButton>
        <Link href={`/boda/${couple.slug}`} target="_blank" className="text-forest underline underline-offset-4">
          Ver página pública ↗
        </Link>
      </div>
    </form>
  );
}

import Link from "next/link";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { savePublicInfo } from "../actions";
import { getCurrentCouple } from "../data";
import { coverCss } from "@/core/url";
import { CoverField } from "./cover-field";
import { CoverUpload } from "./cover-upload";
import { ScheduleEditor } from "./schedule-editor";

function Field({ name, label, defaultValue, placeholder, rows, type = "text", hint, maxLength }: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  rows?: number;
  type?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {rows ? (
        <textarea id={name} name={name} rows={rows} maxLength={maxLength} defaultValue={defaultValue} placeholder={placeholder} className="field" />
      ) : (
        <input id={name} name={name} type={type} maxLength={maxLength} defaultValue={defaultValue} placeholder={placeholder} className="field" />
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export default async function MyPage() {
  const couple = await getCurrentCouple();
  const info = couple.publicInfo;

  return (
    <div className="space-y-6">
      <CoverUpload preview={info.coverPhotoId ? coverCss(couple.slug, info) : null} />
      <form action={savePublicInfo} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card space-y-5">
            <div>
              <h2 className="section-title">Lo que ven sus invitados</h2>
              <p className="text-sm text-ink/60">Así se presenta su página.</p>
            </div>
            <Field name="headline" label="Título" maxLength={120} defaultValue={info.headline} placeholder="¡Nos casamos!" />
            <Field name="story" label="Nuestra historia" maxLength={2000} defaultValue={info.story} rows={5} placeholder="Cuéntenles cómo se conocieron…" />
            {info.coverPhotoId ? (
              <input type="hidden" name="coverImageUrl" value={info.coverImageUrl} />
            ) : (
              <CoverField defaultValue={info.coverImageUrl} />
            )}
          </section>
  
          <section className="card space-y-5">
            <div>
              <h2 className="section-title">Dónde y cuándo</h2>
              <p className="text-sm text-ink/60">La fecha la carga el equipo Weddinas. Si cambia, avísennos.</p>
            </div>
            <Field name="venue" label="Lugar" maxLength={200} defaultValue={info.venue} placeholder="Estancia…" />
            <Field name="venueAddress" label="Dirección" maxLength={300} defaultValue={info.venueAddress} />
            <Field
              name="mapUrl"
              label="Link a Google Maps"
              type="url"
              maxLength={500}
              defaultValue={info.mapUrl}
              placeholder="https://maps.google.com/…"
              hint="El mapa de la página se arma solo con el lugar y la dirección. Este link es opcional, para el botón «Cómo llegar»."
            />
            <div>
              <span className="label">Cronograma del día</span>
              <ScheduleEditor initial={info.schedule} />
            </div>
          </section>
  
          <section className="card space-y-5 lg:col-span-2">
            <h2 className="section-title">Detalles</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <Field name="dressCode" label="Dress code" maxLength={500} defaultValue={info.dressCode} placeholder="Elegante sport" />
              <Field name="giftInfo" label="Mensaje sobre regalos" maxLength={1000} defaultValue={info.giftInfo} rows={3} placeholder="Su presencia es nuestro mejor regalo…" />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <Field name="giftAlias" label="Alias" maxLength={20} defaultValue={info.giftAlias ?? ""} placeholder="sofi.martin.boda" hint="De 6 a 20 letras, números, puntos o guiones." />
              <Field name="giftCbu" label="CBU o CVU" maxLength={30} defaultValue={info.giftCbu ?? ""} placeholder="22 números" hint="Si no tiene 22 números, no se muestra." />
              <Field name="giftHolder" label="Titular de la cuenta" maxLength={120} defaultValue={info.giftHolder ?? ""} />
            </div>
            <p className="hint">Sus invitados ven el alias y el CBU con un botón para copiarlos.</p>
          </section>
        </div>
  
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-full bg-white/90 px-4 py-3 shadow-soft ring-1 ring-forest/10 backdrop-blur sm:px-6">
          <Link href={`/boda/${couple.slug}`} target="_blank" className="flex items-center gap-2 text-sm text-forest underline-offset-4 hover:underline">
            <Icon name="external" className="h-4 w-4" />
            Ver página pública
          </Link>
          <SubmitButton doneText="¡Guardado!">Guardar cambios</SubmitButton>
        </div>
      </form>
    </div>
  );
}

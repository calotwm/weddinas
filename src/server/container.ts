import "server-only";
import path from "node:path";
import { hashAccessCode } from "@/core/access-code";
import { defaultBrief, defaultMusic } from "@/core/brief-catalog";
import { emptyPublicInfo, type BriefBlock } from "@/core/couple";
import { PortalService } from "@/core/portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { LocalFileStore } from "@/infra/local-file-store";
import { PublicRatesProvider } from "@/infra/public-rates";

const dataFile = process.env.DATA_FILE ?? path.join(process.cwd(), "data", "db.json");
const repo = new JsonCoupleRepository(dataFile);

export const portal = new PortalService(repo);

export const rates = new PublicRatesProvider();

/** Uploads live next to the database file, so on Railway they share its volume. */
export const files = new LocalFileStore(path.join(path.dirname(dataFile), "uploads"));

export const DEMO_ACCESS_CODE = "DEMO-BODA";

/** Seeds one demo couple on an empty local database so the portal can be tried right away. */
export async function ensureDemoData(): Promise<void> {
  if (process.env.NODE_ENV === "production" || (await repo.list()).length > 0) return;

  const weddingDate = new Date();
  weddingDate.setMonth(weddingDate.getMonth() + 5);
  weddingDate.setHours(19, 30, 0, 0);

  await repo.save({
    id: "demo",
    slug: "sofia-y-martin",
    partnerA: "Sofía",
    partnerB: "Martín",
    weddingDate: weddingDate.toISOString().slice(0, 16),
    accessCodeHash: hashAccessCode(DEMO_ACCESS_CODE),
    publicInfo: {
      ...emptyPublicInfo(),
      headline: "¡Nos casamos!",
      story: "Nos conocimos en un asado de amigos y nunca más dejamos de reírnos juntos. Queremos que estén ese día con nosotros.",
      venue: "Estancia La Linda",
      venueAddress: "Ruta 6 km 32, Cardales, Buenos Aires",
      mapUrl: "https://maps.google.com/?q=Cardales",
      dressCode: "Elegante sport. ¡Traigan calzado cómodo para bailar!",
      giftInfo: "Su presencia es nuestro mejor regalo. Si quieren ayudarnos con la luna de miel:",
      giftAlias: "sofi.martin.boda",
      giftCbu: "0000003100012345678901",
      giftHolder: "Sofía Pérez",
      coverImageUrl: "https://weddinas.com/wp-content/uploads/2025/07/portada.jpg",
      schedule: [
        { time: "19:30", title: "Ceremonia" },
        { time: "20:30", title: "Recepción" },
        { time: "22:00", title: "Cena" },
        { time: "00:00", title: "¡Fiesta!" },
      ],
    },
    proposals: [
      {
        id: "demo-p1",
        title: "Ambientación: estilo campo romántico",
        description: "Guirnaldas de luces cálidas, mesas largas de madera y centros con flores de estación en tonos durazno.",
        link: "",
        amount: "$ 1.850.000",
        status: "pending",
        coupleComment: "",
        createdAt: new Date().toISOString(),
        respondedAt: null,
      },
    ],
    reports: [
      {
        id: "demo-r1",
        title: "Reporte mensual · Avance general",
        body: "Confirmamos fecha con la estancia y señamos catering.\nEsta semana visitamos 2 opciones de DJ y les mandamos la comparativa.\nPróximo paso: degustación del menú.",
        createdAt: new Date().toISOString(),
      },
    ],
    tasks: [
      { id: "demo-t1", title: "Armar lista de invitados", done: true },
      { id: "demo-t2", title: "Elegir fotógrafo", done: false },
      { id: "demo-t3", title: "Prueba de vestido", done: false },
    ],
    budget: {
      usdQuote: "blue",
      guests: 160,
      items: [
        { id: "demo-b1", category: "espacio", vendor: "Estancia La Linda", concept: "Salón + parque", amount: 18000, currency: "USD", adjustment: "frozen", baseMonth: month(-3), note: "Saldo congelado en USD", payments: [
          { id: "demo-pay1", date: day(-80), amount: 9000, currency: "USD", arsPerUsd: null, kind: "sena", note: "50% seña" },
        ] },
        { id: "demo-b2", category: "catering", vendor: "Sabores de Campo", concept: "Menú formal x 160", amount: 32000000, currency: "ARS", adjustment: "ipc", baseMonth: month(-4), note: "Saldo se ajusta por IPC", payments: [
          { id: "demo-pay2", date: day(-110), amount: 9600000, currency: "ARS", arsPerUsd: null, kind: "sena", note: "30% seña" },
        ] },
        { id: "demo-b3", category: "foto", vendor: "Luz Norte Fotografía", concept: "Cobertura completa 2 cámaras", amount: 2400, currency: "USD", adjustment: "frozen", baseMonth: month(-2), note: "", payments: [
          { id: "demo-pay3", date: day(-50), amount: 1800000, currency: "ARS", arsPerUsd: 1500, kind: "sena", note: "Seña pagada en pesos" },
        ] },
        { id: "demo-b4", category: "dj", vendor: "Pulso DJ", concept: "DJ + técnica + pista", amount: 6500000, currency: "ARS", adjustment: "ipc", baseMonth: month(-1), note: "", payments: [] },
      ],
    },
    brief: demoBrief(),
    ideas: "Boda de campo al atardecer, tonos durazno y verde salvia. Mucha luz cálida y mesas largas.",
    music: {
      ...defaultMusic(),
      songs: defaultMusic().songs.map((s) =>
        s.moment === "entrada-novia" ? { ...s, song: "A Thousand Years", artist: "Christina Perri", status: "chosen" as const }
        : s.moment === "vals" ? { ...s, song: "Perfect", artist: "Ed Sheeran", status: "chosen" as const }
        : s.moment === "cierre" ? { ...s, song: "Mil horas", artist: "Los Abuelos de la Nada", status: "chosen" as const }
        : s,
      ),
      playlistUrl: "https://open.spotify.com/",
      mustPlay: "Cumbia de los 2000 en la última tanda",
      banned: "Nada de reggaeton viejo",
    },
    family: [
      { id: "demo-f1", side: "a", name: "Elena", relation: "Abuela", photoId: null },
      { id: "demo-f2", side: "a", name: "Carla y Diego", relation: "Padres", photoId: null },
      { id: "demo-f3", side: "b", name: "Ramón", relation: "Padrino", photoId: null },
    ],
    createdAt: new Date().toISOString(),
  });
}

/** "YYYY-MM" n months from now. */
function month(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

/** "YYYY-MM-DD" n days from now. */
function day(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

function demoBrief(): BriefBlock[] {
  const fill: Record<string, Partial<BriefBlock> & { details?: Record<string, string> }> = {
    evento: { status: "confirmed", details: { Lugar: "Estancia La Linda", "Cantidad de invitados": "160", "Tipo de boda": "Formal de campo" } },
    espacio: { vendor: "Estancia La Linda", status: "confirmed", owner: "Pau", details: { Pago: "50%", "Cantidad de horas": "8", "Mobiliario incluido": "Sí, mesas largas de madera" } },
    catering: { vendor: "Sabores de Campo", status: "confirmed", owner: "Belu", details: { Pago: "30%", Degustación: "Ya realizada", Servicio: "Formal", "Pax confirmados": "160" } },
    foto: { vendor: "Luz Norte Fotografía", status: "confirmed", owner: "Pau", details: { Pago: "Seña", Cobertura: "2 cámaras" } },
    dj: { vendor: "Pulso DJ", status: "deciding", owner: "Nat" },
  };
  return defaultBrief().map((block) => {
    const f = fill[block.key];
    if (!f) return block;
    const { details = {}, ...rest } = f;
    return { ...block, ...rest, fields: block.fields.map((field) => ({ ...field, detail: details[field.label] ?? field.detail })) };
  });
}

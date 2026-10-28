import "server-only";
import path from "node:path";
import { hashAccessCode } from "@/core/access-code";
import { emptyPublicInfo } from "@/core/couple";
import { PortalService } from "@/core/portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const repo = new JsonCoupleRepository(process.env.DATA_FILE ?? path.join(process.cwd(), "data", "db.json"));

export const portal = new PortalService(repo);

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
      giftInfo: "Su presencia es nuestro mejor regalo. Si quieren ayudarnos con la luna de miel: CBU 0000000000000000000000 · Alias SOFI.MARTIN.BODA",
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
    createdAt: new Date().toISOString(),
  });
}

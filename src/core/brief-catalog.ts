import type { BriefBlock, Music, SongChoice } from "./couple";

export interface CatalogBlock {
  key: string;
  name: string;
  kind: BriefBlock["kind"];
  fields: string[];
  /** Added to every new brief; the rest are added on demand. */
  core?: boolean;
}

/** Sections of Weddinas' Excel brief ("INTERNO - Brief"), with their field labels. */
export const BRIEF_CATALOG: CatalogBlock[] = [
  { key: "evento", name: "Información del evento", kind: "event", core: true, fields: ["Fecha", "Hora", "Lugar", "Cantidad de invitados", "Tipo de boda", "Previa ella", "Previa él"] },
  { key: "invitaciones", name: "Invitaciones", kind: "event", core: true, fields: ["Save the Date", "Invitación digital", "Confirmaciones"] },
  { key: "civil", name: "Civil", kind: "event", core: true, fields: ["Fecha", "Horario", "Registro civil", "Tirada civil", "Post civil", "Previa"] },
  { key: "ceremonia", name: "Ceremonia", kind: "event", core: true, fields: ["Oficia", "Música", "Reservados", "Damas de honor", "Caballeros de honor", "Testigos", "Votos", "Discursos", "Entrada novio", "Cortejo", "Entrada novia", "Anillos"] },
  { key: "espacio", name: "Espacio", kind: "vendor", core: true, fields: ["Pago", "Cantidad de horas", "Impuestos musicales", "Mobiliario incluido", "Canon", "Depósito"] },
  { key: "catering", name: "Catering", kind: "vendor", core: true, fields: ["Pago", "Degustación", "Precoctel", "Servicio", "Fletes", "Pax confirmados", "Recepción", "Islas", "Plato principal", "Menú celíaco", "Menú niños", "Menú vegetariano", "Postre", "Torta de casamiento", "Mesa dulce", "Café", "Fin de fiesta", "Mantelería", "Vinos y champagne", "Vianda proveedores"] },
  { key: "barra", name: "Barra de tragos", kind: "vendor", core: true, fields: ["Pago", "Degustación", "Precoctel", "Servicio", "Pax confirmados", "Tragos de autor", "Tragos clásicos", "Etiquetas", "Personal", "Cervezas", "Módulos recepción", "Módulos fiesta"] },
  { key: "dj", name: "DJ y técnica", kind: "vendor", core: true, fields: ["Pago", "DJ", "Reunión musical", "Ceremonia", "Recepción", "Salón principal", "Pista de baile", "Efectos", "Requerimientos proveedores", "Requerimiento show", "Grupo electrógeno", "Visuales"] },
  { key: "ambientacion", name: "Ambientación", kind: "vendor", core: true, fields: ["Pago", "Depósito", "Fletes", "Paleta de colores / flores", "Sector de ingreso", "Ceremonia", "Recepción", "Sector principal", "Adicionales", "Plan A", "Plan B"] },
  { key: "foto", name: "Foto", kind: "vendor", core: true, fields: ["Pago", "Viáticos", "Cobertura", "Civil", "Preboda", "Post boda", "Horario llegada", "Fotos infaltables", "Entrega"] },
  { key: "video", name: "Video", kind: "vendor", core: true, fields: ["Pago", "Viáticos", "Cobertura", "Civil", "Racconto", "Horario llegada", "Entrega"] },
  { key: "show-ceremonia", name: "Show ceremonia", kind: "vendor", fields: ["Pago", "Viáticos", "Servicio", "Horario servicio", "Horario llegada", "Canciones elegidas", "Repertorio", "Rider", "Requerimientos"] },
  { key: "show-intervencion", name: "Show intervención", kind: "vendor", fields: ["Pago", "Viáticos", "Servicio", "Horario servicio", "Horario llegada", "Repertorio", "Rider", "Requerimientos"] },
  { key: "show-fiesta", name: "Show fiesta", kind: "vendor", fields: ["Pago", "Servicio", "Horario servicio", "Cantidad de personas", "Requerimientos"] },
  { key: "fotoiman", name: "Fotoimán / cabina", kind: "vendor", fields: ["Pago", "Viáticos", "Servicio", "Cantidad de horas", "Horario servicio", "Horario llegada", "Diseño tirita", "Requerimientos"] },
  { key: "arte-en-vivo", name: "Arte en vivo", kind: "vendor", fields: ["Pago", "Viáticos", "Servicio", "Cantidad de horas", "Horario servicio", "Requerimientos"] },
  { key: "papeleria", name: "Papelería y detalles", kind: "vendor", fields: ["Pago", "Retiro", "Diseños", "Tirada civil", "Tirada ceremonia", "Reservados ceremonia", "Seating plan", "Menús", "Números de mesa", "Cartas de tragos", "Kits de baño"] },
  { key: "cotillon", name: "Cotillón", kind: "vendor", fields: ["Pago", "Envío", "Novia", "Novio", "Especiales", "Entrada a la pista", "Extras"] },
  { key: "souvenir", name: "Souvenir", kind: "vendor", fields: ["Pago", "Envío", "Producto", "Requerimientos"] },
  { key: "ramo", name: "Ramo y boutonniere", kind: "vendor", fields: ["Pago", "Envío / dirección", "Civil", "Ceremonia", "Boutonniere", "Tirada"] },
  { key: "maquillaje", name: "Maquillaje y peinado", kind: "vendor", fields: ["Pago", "Viáticos", "Novia", "Acompañantes", "Prueba", "Civil", "Horario ceremonia"] },
  { key: "look-novia", name: "Look novia", kind: "vendor", fields: ["Vestido", "Zapatos", "Accesorios", "Segundo vestido", "Look civil"] },
  { key: "look-novio", name: "Look novio", kind: "vendor", fields: ["Traje", "Zapatos", "Accesorios"] },
  { key: "alianzas", name: "Alianzas", kind: "vendor", fields: ["Pago", "Envío"] },
  { key: "combis", name: "Combis", kind: "vendor", fields: ["Pago", "Recorrido", "Cantidad de pasajeros", "Lugar salida", "Horario salida", "Lugar destino", "Horario destino"] },
  { key: "auto", name: "Auto", kind: "vendor", fields: ["Pago", "Recorrido", "Lugar salida", "Horario salida", "Lugar destino", "Horario destino"] },
  { key: "torta", name: "Torta", kind: "vendor", fields: ["Pago", "Diseño", "Sabores", "Retiro"] },
  { key: "glitter", name: "Glitter / tatuajes", kind: "vendor", fields: ["Pago", "Tatuajes incluidos", "Horario servicio"] },
  { key: "juegos", name: "Juegos", kind: "vendor", fields: ["Pago", "Retiro"] },
  { key: "noche-de-bodas", name: "Noche de bodas / hospedaje", kind: "vendor", fields: ["Pago", "Paquete", "Check in", "Check out"] },
];

export const catalogBlock = (key: string) => BRIEF_CATALOG.find((b) => b.key === key);

export const categoryName = (key: string) => catalogBlock(key)?.name ?? key;

export function newBriefBlock(entry: CatalogBlock): BriefBlock {
  return {
    key: entry.key,
    name: entry.name,
    kind: entry.kind,
    vendor: "",
    contact: "",
    status: entry.kind === "event" ? "deciding" : "searching",
    owner: "",
    fields: entry.fields.map((label) => ({ label, detail: "", note: "" })),
  };
}

export const defaultBrief = (): BriefBlock[] => BRIEF_CATALOG.filter((b) => b.core).map(newBriefBlock);

/** Moments of Weddinas' "Elección de canciones" sheet, grouped as in the sheet. */
export const SONG_MOMENTS: Array<{ group: string; moments: Array<{ key: string; label: string }> }> = [
  { group: "Ceremonia", moments: [
    { key: "ingreso-invitados", label: "Ingreso de invitados" },
    { key: "entrada-damas", label: "Entrada damas y caballeros" },
    { key: "entrada-novio", label: "Entrada novio" },
    { key: "cortejo", label: "Cortejo" },
    { key: "entrada-novia", label: "Entrada novia" },
    { key: "alianzas", label: "Intercambio de alianzas" },
    { key: "salida", label: "Salida" },
  ] },
  { group: "Comidas", moments: [
    { key: "recepcion", label: "Recepción" },
    { key: "plato-principal", label: "Plato principal" },
    { key: "postre", label: "Postre" },
  ] },
  { group: "Fiesta", moments: [
    { key: "entrada-pista", label: "Entrada a la pista" },
    { key: "vals", label: "Vals" },
    { key: "brindis", label: "Brindis y corte de torta" },
    { key: "ramo", label: "Ramo" },
    { key: "whisky", label: "Whisky" },
    { key: "cierre", label: "Canción de cierre" },
  ] },
];

export const SONG_MOMENT_KEYS = SONG_MOMENTS.flatMap((g) => g.moments.map((m) => m.key));

export const defaultMusic = (): Music => ({
  songs: SONG_MOMENT_KEYS.map((moment): SongChoice => ({ moment, song: "", artist: "", status: "pending", note: "" })),
  playlistUrl: "",
  mustPlay: "",
  banned: "",
});

import type { BriefBlock, Music, SongChoice } from "./couple";

export interface CatalogBlock {
  key: string;
  name: string;
  kind: BriefBlock["kind"];
  fields: string[];
  /** Added to every new brief; the rest are added on demand. */
  core?: boolean;
}

/** Fields every vendor shows, in this order ("Documentos" are the block's attachments). */
export const VENDOR_COMMON_FIELDS = [
  "Pago",
  "Cantidad de horas",
  "Cantidad de personas confirmadas",
  "Servicio",
  "Fletes",
  "Depósito de garantía",
  "Contrato",
  "Detalle del servicio",
];

/** Old field labels and the label that replaced them, so stored details move to the new field. */
const RENAMED_FIELDS: Record<string, string> = {
  "Pax confirmados": "Cantidad de personas confirmadas",
  "Depósito": "Depósito de garantía",
  "Mobiliario incluido": "Mobiliario",
  "Torta de casamiento": "Torta de bodas",
  "Fin de fiesta": "Fin de fiesta gastronómico",
};

const vendor = (fields: string[]) => [
  ...new Set([...VENDOR_COMMON_FIELDS, ...fields.map((f) => RENAMED_FIELDS[f] ?? f)]),
];

/** Sections of Weddinas' Excel brief ("INTERNO - Brief"), with their field labels. */
export const BRIEF_CATALOG: CatalogBlock[] = [
  { key: "evento", name: "Información del evento", kind: "event", core: true, fields: ["Fecha", "Hora", "Lugar", "Cantidad de invitados", "Tipo de boda", "Previa ella", "Previa él"] },
  { key: "invitaciones", name: "Invitaciones", kind: "event", core: true, fields: ["Save the Date", "Invitación digital", "Confirmaciones"] },
  { key: "civil", name: "Civil", kind: "event", core: true, fields: ["Fecha", "Horario", "Registro civil", "Tirada civil", "Post civil", "Previa"] },
  { key: "ceremonia", name: "Ceremonia", kind: "event", core: true, fields: ["Oficia", "Música", "Reservados", "Damas de honor", "Caballeros de honor", "Testigos", "Votos", "Discursos", "Entrada novio", "Cortejo", "Entrada novia", "Anillos"] },
  { key: "espacio", name: "Espacio", kind: "vendor", core: true, fields: vendor(["Mobiliario", "Impuestos musicales", "Canon"]) },
  { key: "catering", name: "Catering", kind: "vendor", core: true, fields: vendor(["Recepción", "Bocaditos fríos y calientes", "Islas", "Plato principal", "Postre", "Mesa dulce", "Torta de bodas", "Café", "Fin de fiesta gastronómico", "Mantelería", "Vinos y champagne", "Adicionales", "Aclaraciones", "Vianda proveedores", "Degustación", "Precoctel", "Menú celíaco", "Menú niños", "Menú vegetariano"]) },
  { key: "barra", name: "Barra de tragos", kind: "vendor", core: true, fields: vendor(["Pago", "Degustación", "Precoctel", "Servicio", "Pax confirmados", "Tragos de autor", "Tragos clásicos", "Etiquetas", "Personal", "Cervezas", "Módulos recepción", "Módulos fiesta"]) },
  { key: "dj", name: "DJ y técnica", kind: "vendor", core: true, fields: vendor(["Pago", "DJ", "Reunión musical", "Ceremonia", "Recepción", "Salón principal", "Pista de baile", "Efectos", "Requerimientos proveedores", "Requerimiento show", "Grupo electrógeno", "Visuales"]) },
  { key: "ambientacion", name: "Ambientación", kind: "vendor", core: true, fields: vendor(["Pago", "Depósito", "Fletes", "Paleta de colores / flores", "Sector de ingreso", "Ceremonia", "Recepción", "Sector principal", "Adicionales", "Plan A", "Plan B"]) },
  { key: "foto", name: "Foto", kind: "vendor", core: true, fields: vendor(["Pago", "Viáticos", "Cobertura", "Civil", "Preboda", "Post boda", "Horario llegada", "Fotos infaltables", "Entrega"]) },
  { key: "video", name: "Video", kind: "vendor", core: true, fields: vendor(["Pago", "Viáticos", "Cobertura", "Civil", "Racconto", "Horario llegada", "Entrega"]) },
  { key: "show-ceremonia", name: "Show ceremonia", kind: "vendor", fields: vendor(["Pago", "Viáticos", "Servicio", "Horario servicio", "Horario llegada", "Canciones elegidas", "Repertorio", "Rider", "Requerimientos"]) },
  { key: "show-intervencion", name: "Show intervención", kind: "vendor", fields: vendor(["Pago", "Viáticos", "Servicio", "Horario servicio", "Horario llegada", "Repertorio", "Rider", "Requerimientos"]) },
  { key: "show-fiesta", name: "Show fiesta", kind: "vendor", fields: vendor(["Pago", "Servicio", "Horario servicio", "Cantidad de personas", "Requerimientos"]) },
  { key: "fotoiman", name: "Fotoimán / cabina", kind: "vendor", fields: vendor(["Pago", "Viáticos", "Servicio", "Cantidad de horas", "Horario servicio", "Horario llegada", "Diseño tirita", "Requerimientos"]) },
  { key: "arte-en-vivo", name: "Arte en vivo", kind: "vendor", fields: vendor(["Pago", "Viáticos", "Servicio", "Cantidad de horas", "Horario servicio", "Requerimientos"]) },
  { key: "papeleria", name: "Papelería y detalles", kind: "vendor", fields: vendor(["Pago", "Retiro", "Diseños", "Tirada civil", "Tirada ceremonia", "Reservados ceremonia", "Seating plan", "Menús", "Números de mesa", "Cartas de tragos", "Kits de baño"]) },
  { key: "cotillon", name: "Cotillón", kind: "vendor", fields: vendor(["Pago", "Envío", "Novia", "Novio", "Especiales", "Entrada a la pista", "Extras"]) },
  { key: "souvenir", name: "Souvenir", kind: "vendor", fields: vendor(["Pago", "Envío", "Producto", "Requerimientos"]) },
  { key: "ramo", name: "Ramo y boutonniere", kind: "vendor", fields: vendor(["Pago", "Envío / dirección", "Civil", "Ceremonia", "Boutonniere", "Tirada"]) },
  { key: "maquillaje", name: "Maquillaje y peinado", kind: "vendor", fields: vendor(["Pago", "Viáticos", "Novia", "Acompañantes", "Prueba", "Civil", "Horario ceremonia"]) },
  { key: "look-novia", name: "Look novia", kind: "vendor", fields: vendor(["Vestido", "Zapatos", "Accesorios", "Segundo vestido", "Look civil"]) },
  { key: "look-novio", name: "Look novio", kind: "vendor", fields: vendor(["Traje", "Zapatos", "Accesorios"]) },
  { key: "alianzas", name: "Alianzas", kind: "vendor", fields: vendor(["Pago", "Envío"]) },
  { key: "combis", name: "Combis", kind: "vendor", fields: vendor(["Pago", "Recorrido", "Cantidad de pasajeros", "Lugar salida", "Horario salida", "Lugar destino", "Horario destino"]) },
  { key: "auto", name: "Auto", kind: "vendor", fields: vendor(["Pago", "Recorrido", "Lugar salida", "Horario salida", "Lugar destino", "Horario destino"]) },
  { key: "torta", name: "Torta", kind: "vendor", fields: vendor(["Pago", "Diseño", "Sabores", "Retiro"]) },
  { key: "glitter", name: "Glitter / tatuajes", kind: "vendor", fields: vendor(["Pago", "Tatuajes incluidos", "Horario servicio"]) },
  { key: "juegos", name: "Juegos", kind: "vendor", fields: vendor(["Pago", "Retiro"]) },
  { key: "noche-de-bodas", name: "Noche de bodas / hospedaje", kind: "vendor", fields: vendor(["Pago", "Paquete", "Check in", "Check out"]) },
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

/** Brings a stored block up to its catalog: catalog fields first (renamed labels keep their detail), then the block's own extra fields. */
export function withCatalogFields(block: BriefBlock): BriefBlock {
  const entry = catalogBlock(block.key);
  if (!entry) return block;
  const own = block.fields.map((f) => ({ ...f, label: RENAMED_FIELDS[f.label] ?? f.label }));
  const used = new Set<number>();
  const fields = entry.fields.map((label) => {
    const i = own.findIndex((f, j) => !used.has(j) && f.label === label);
    if (i === -1) return { label, detail: "", note: "" };
    used.add(i);
    return own[i];
  });
  block.fields = [...fields, ...own.filter((_, j) => !used.has(j))];
  return block;
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

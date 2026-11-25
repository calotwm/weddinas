import { normalizeBlockStatus, type BriefBlock, type Music, type SongChoice } from "./couple";
import { slugify } from "./slug";

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

/**
 * Sections of Weddinas' Excel brief ("INTERNO - Brief"), with their field labels. The rubros the team shaped in the
 * "Agus y Ventu" brief use exactly its rows and order (TEMPLATE_VERSION); the rest keep the common vendor rows.
 */
export const BRIEF_CATALOG: CatalogBlock[] = [
  { key: "evento", name: "Información del evento", kind: "event", core: true, fields: ["Fecha",  "Hora",  "Lugar",  "Cantidad de invitados",  "Tipo de boda",  "Previa ella",  "Previa él"] },
  { key: "invitaciones", name: "Invitaciones", kind: "event", core: true, fields: ["Save the Date",  "Invitación digital"] },
  { key: "civil", name: "Civil", kind: "event", core: true, fields: ["Fecha",  "Horario",  "Registro civil",  "Tirada civil",  "Post civil",  "Previa"] },
  { key: "ceremonia", name: "Ceremonia", kind: "event", core: true, fields: ["Música",  "Reservados",  "Damas de honor",  "Caballeros de honor",  "Testigos",  "Votos",  "Discursos",  "Entrada novio",  "Cortejo",  "Entrada novia",  "Anillos",  "Tirada"] },
  { key: "espacio", name: "Espacio", kind: "vendor", core: true, fields: ["Pago",  "Cantidad de horas",  "Cantidad de personas confirmadas",  "Servicio",  "Fletes",  "Depósito de garantía",  "Impuestos musicales",  "Canon",  "Detalle del servicio",  "Mobiliario",  "Adicionales"] },
  { key: "ceremonia-proveedor", name: "Ceremonia", kind: "vendor", core: true, fields: vendor(["Oficiante", "Horario servicio", "Horario llegada", "Requerimientos"]) },
  { key: "catering", name: "Catering", kind: "vendor", core: true, fields: ["Pago",  "Servicio",  "Cantidad de horas",  "Cantidad de personas confirmadas",  "Fletes",  "Depósito de garantía",  "Degustación",  "Precoctel",  "Recepción",  "Islas",  "Plato principal",  "Menú niños",  "Menú vegetariano",  "Menú celíaco",  "Postre",  "Mesa dulce",  "Torta de bodas",  "Café",  "Fin de fiesta gastronómico",  "Mantelería",  "Vinos y champagne",  "Adicionales",  "Aclaraciones",  "Vianda proveedores"] },
  { key: "barra", name: "Barra de tragos", kind: "vendor", core: true, fields: ["Pago",  "Servicio",  "Cantidad de horas",  "Cantidad de personas confirmadas",  "Fletes",  "Depósito de garantía",  "Degustación",  "Precoctel",  "Trago de la novia",  "Trago del novio",  "Tragos de autor",  "Tragos clásicos",  "Etiquetas",  "Personal",  "Cervezas",  "Cervezas sin alcohol",  "Módulos recepción",  "Módulos fiesta",  "Esquinero",  "Adicionales",  "Aclaraciones"] },
  { key: "dj", name: "DJ y técnica", kind: "vendor", core: true, fields: ["Pago",  "Cantidad de horas",  "Fletes",  "Depósito de garantía",  "DJ",  "Reunión musical",  "Ceremonia",  "Recepción",  "Salón principal",  "Pista de baile",  "Sector dj",  "Efectos",  "Requerimientos proveedores",  "Visuales",  "Grupo electrógeno",  "Aclaraciones"] },
  { key: "ambientacion", name: "Ambientación", kind: "vendor", core: true, fields: ["Pago",  "Cantidad de personas confirmadas",  "Fletes",  "Depósito de garantía",  "Paleta de colores / flores",  "Sector de ingreso",  "Ceremonia",  "Recepción",  "Sector principal",  "Adicionales",  "Aclaraciones",  "Plan A",  "Plan B"] },
  { key: "foto", name: "Foto", kind: "vendor", core: true, fields: ["Pago",  "Cantidad de horas",  "Viáticos",  "Cobertura",  "Civil",  "Preboda",  "Post boda",  "Horario llegada",  "Fotos infaltables",  "Entrega",  "Adicionales"] },
  { key: "video", name: "Video", kind: "vendor", core: true, fields: ["Pago",  "Cantidad de horas",  "Viáticos",  "Cobertura",  "Civil",  "Racconto",  "Horario llegada",  "Entrega",  "Aclaraciones"] },
  { key: "show-ceremonia", name: "Show ceremonia", kind: "vendor", fields: ["Pago",  "Servicio",  "Viáticos",  "Horario llegada",  "Horario servicio",  "Canciones elegidas",  "Repertorio",  "Rider",  "Requerimientos"] },
  { key: "show-intervencion", name: "Show intervención", kind: "vendor", fields: ["Pago",  "Servicio",  "Viáticos",  "Horario llegada",  "Horario servicio",  "Canciones elegidas",  "Repertorio",  "Rider",  "Requerimientos"] },
  { key: "show-fiesta", name: "Show fiesta", kind: "vendor", fields: ["Pago",  "Servicio",  "Horario llegada",  "Horario servicio",  "Canciones elegidas",  "Repertorio",  "Requerimientos"] },
  { key: "fotoiman", name: "Fotoimán / cabina", kind: "vendor", fields: ["Pago",  "Servicio",  "Cantidad de horas",  "Viáticos",  "Horario llegada",  "Horario servicio",  "Diseño tirita",  "Requerimientos"] },
  { key: "arte-en-vivo", name: "Arte en vivo", kind: "vendor", fields: vendor(["Pago", "Viáticos", "Servicio", "Cantidad de horas", "Horario servicio", "Requerimientos"]) },
  { key: "papeleria", name: "Papelería y detalles", kind: "vendor", fields: ["Pago",  "Retiro",  "Diseños",  "Tirada civil",  "Tirada ceremonia",  "Reservados ceremonia",  "Seating plan",  "Menús",  "Números de mesa",  "Cartas de tragos",  "Kits de baño"] },
  { key: "cotillon", name: "Cotillón", kind: "vendor", fields: ["Pago",  "Temática",  "Envío",  "Novia",  "Novio",  "Especiales",  "Entrada a la pista",  "Cabeza",  "Anteojos",  "Extras"] },
  { key: "souvenir", name: "Souvenir", kind: "vendor", fields: ["Pago",  "Envío",  "Producto"] },
  { key: "ramo", name: "Ramo y boutonniere", kind: "vendor", fields: ["Pago",  "Envío / dirección",  "Civil",  "Ceremonia",  "Boutonniere",  "Tirada"] },
  { key: "maquillaje", name: "Maquillaje y peinado", kind: "vendor", fields: ["Pago",  "Viáticos",  "Novia",  "Acompañantes",  "Prueba",  "Civil",  "Lugar civil",  "Horarios civil",  "Horario ceremonia",  "Lugar ceremonia"] },
  { key: "look-novia", name: "Look novia", kind: "vendor", fields: ["Pago",  "Cantidad de horas",  "Cantidad de personas confirmadas",  "Servicio",  "Fletes",  "Depósito de garantía",  "Detalle del servicio",  "Vestido",  "Zapatos",  "Accesorios",  "Segundo vestido",  "Look civil"] },
  { key: "look-novio", name: "Look novio", kind: "vendor", fields: ["Pago",  "Cantidad de horas",  "Cantidad de personas confirmadas",  "Servicio",  "Fletes",  "Depósito de garantía",  "Detalle del servicio",  "Traje",  "Zapatos",  "Accesorios"] },
  { key: "alianzas", name: "Alianzas", kind: "vendor", fields: vendor(["Pago", "Envío"]) },
  { key: "combis", name: "Autos y Combis", kind: "vendor", fields: ["Pago",  "Servicio"] },
  { key: "auto", name: "Auto", kind: "vendor", fields: vendor(["Pago", "Recorrido", "Lugar salida", "Horario salida", "Lugar destino", "Horario destino"]) },
  { key: "torta", name: "Torta", kind: "vendor", fields: vendor(["Pago", "Diseño", "Sabores", "Retiro"]) },
  { key: "glitter", name: "Glitter / tatuajes", kind: "vendor", fields: ["Pago",  "Servicio",  "Diseño tatuajes",  "Horario llegada",  "Horario servicio"] },
  { key: "juegos", name: "Juegos", kind: "vendor", fields: ["Pago",  "Servicio",  "Fletes",  "Horario llegada",  "Horario servicio"] },
  { key: "noche-de-bodas", name: "Noche de bodas / hospedaje", kind: "vendor", fields: vendor(["Pago", "Paquete", "Check in", "Check out"]) },
];

/** Bump when the catalog rows change so every stored brief is reshaped to them once (see withCatalogFields). */
export const TEMPLATE_VERSION = 1;

export const catalogBlock = (key: string) => BRIEF_CATALOG.find((b) => b.key === key);

/** Rubros the team adds by name ("Fuegos artificiales") get this key prefix plus the name's slug. */
export const CUSTOM_BLOCK_PREFIX = "custom-";
export const CUSTOM_BLOCK_NAME_MAX = 60;

/** Who can be in charge of a brief rubro ("A cargo"): the agency or one of the team. */
export const TEAM_OWNERS = ["Weddinas", "Cane", "Nat", "More", "Pauli", "Belu", "Abru", "Novios"] as const;
/** Forms send block keys capped at 60 characters. */
const CUSTOM_BLOCK_KEY_MAX = 60;

export const customBlockKey = (name: string) =>
  `${CUSTOM_BLOCK_PREFIX}${slugify(name).slice(0, CUSTOM_BLOCK_KEY_MAX - CUSTOM_BLOCK_PREFIX.length).replace(/-+$/, "")}`;

/** The couple's stored block name (the team may retitle any block), else the catalog name, else a readable form of a custom key. */
export function categoryName(key: string, brief?: ReadonlyArray<Pick<BriefBlock, "key" | "name">>): string {
  const name = brief?.find((b) => b.key === key)?.name || catalogBlock(key)?.name;
  if (name) return name;
  if (!key.startsWith(CUSTOM_BLOCK_PREFIX)) return key;
  const words = key.slice(CUSTOM_BLOCK_PREFIX.length).replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A vendor block for a rubro outside the catalog, with the fields every vendor shows. */
export const newCustomBriefBlock = (name: string): BriefBlock =>
  newBriefBlock({ key: customBlockKey(name), name, kind: "vendor", fields: [...VENDOR_COMMON_FIELDS] });

export function newBriefBlock(entry: CatalogBlock): BriefBlock {
  return {
    key: entry.key,
    name: entry.name,
    kind: entry.kind,
    vendor: "",
    contact: "",
    status: "deciding",
    owner: "",
    fields: entry.fields.map((label) => ({ label, detail: "", note: "" })),
    templateVersion: TEMPLATE_VERSION,
  };
}

/** Team-only row every vendor rubro has: never shown to the couple nor printed for vendors; "Comisiones" lists it. */
export const TEAM_FIELD = "Equipo";

/** The rows the couple (and the printed vendor sheet) may see. */
export const coupleFields = <F extends { label: string }>(fields: F[]): F[] => fields.filter((f) => f.label !== TEAM_FIELD);

/** Rows of the Invitaciones block the couple sees; the rest stay with the team. */
const COUPLE_INVITATION_FIELDS = ["Save the Date", "Invitación digital"];

/**
 * Event blocks the couple sees ("Su casamiento"): every one with something to show, whatever its status but "No
 * aplica". Invitaciones only shows its Save the Date and Invitación digital rows.
 */
export function coupleEventBlocks(brief: BriefBlock[]): BriefBlock[] {
  return brief
    .filter((b) => b.kind === "event" && b.status !== "na")
    .map((b) => (b.key === "invitaciones" ? { ...b, fields: b.fields.filter((f) => COUPLE_INVITATION_FIELDS.includes(f.label)) } : b))
    .filter((b) => coupleFields(b.fields).some((f) => f.detail) || (b.attachments ?? []).some((a) => !a.internal));
}

/** Rows a block always has unless the team removed them: its catalog fields, plus "Equipo" on vendor rubros. */
export function requiredFields(block: Pick<BriefBlock, "key" | "kind">): string[] {
  const fields = catalogBlock(block.key)?.fields ?? [];
  return block.kind === "vendor" && !fields.includes(TEAM_FIELD) ? [...fields, TEAM_FIELD] : fields;
}

/** Catalog names a block had before, so couples that still store them get the current one (a retitled block keeps its own). */
const RENAMED_BLOCKS: Record<string, string[]> = {
  combis: ["Combis"],
};

/** Rows taken out of the catalog, from every block `from` applies to; what they said moves to the end of the `into` row. */
const DROPPED_FIELDS: Array<{ label: string; into: string; from: (block: Pick<BriefBlock, "key" | "kind">) => boolean }> = [
  { label: "Contrato", into: "Detalle del servicio", from: (b) => b.kind === "vendor" },
  { label: "Confirmaciones", into: "Invitación digital", from: (b) => b.key === "invitaciones" },
];

const joinText = (...parts: string[]) => parts.filter(Boolean).join("\n");

function dropRetiredFields(block: BriefBlock): void {
  for (const drop of DROPPED_FIELDS) {
    if (!drop.from(block)) continue;
    const gone = block.fields.filter((f) => f.label === drop.label);
    if (gone.length === 0) continue;
    block.fields = block.fields.filter((f) => f.label !== drop.label);
    const detail = joinText(...gone.map((f) => (f.detail ? `${drop.label}: ${f.detail}` : "")));
    const note = joinText(...gone.map((f) => (f.note ? `${drop.label}: ${f.note}` : "")));
    if (!detail && !note) continue;
    let into = block.fields.find((f) => f.label === drop.into);
    if (!into) block.fields.push((into = { label: drop.into, detail: "", note: "" }));
    into.detail = joinText(into.detail, detail);
    into.note = joinText(into.note, note);
  }
  if (block.removedFields) {
    const kept = block.removedFields.filter((label) => !DROPPED_FIELDS.some((d) => d.label === label && d.from(block)));
    block.removedFields = kept.length > 0 ? kept : undefined;
  }
}

/**
 * Brings a stored block up to its catalog: an old catalog title becomes the current one, the retired "En búsqueda"
 * status reads as "Para decidir", rows taken out of the catalog go (their text moves to another row), renamed labels
 * keep their detail, and required rows it lacks are added at the end. The stored order is kept (the team reorders
 * rows) and rows the team removed stay out.
 */
/**
 * Once per TEMPLATE_VERSION, a catalog block takes the template's rows in its order: rows it already had keep their
 * text, rows outside the template stay (after it) only when something is written in them, and earlier removals reset.
 * After that the team's own order and removals are kept as usual.
 */
function reshapeToTemplate(block: BriefBlock, required: string[]) {
  const pool = [...block.fields];
  const take = (label: string) => {
    const i = pool.findIndex((f) => f.label === label);
    return i === -1 ? { label, detail: "", note: "" } : pool.splice(i, 1)[0];
  };
  const team = required.includes(TEAM_FIELD) ? take(TEAM_FIELD) : null;
  const rows = required.filter((label) => label !== TEAM_FIELD).map(take);
  const written = pool.filter((f) => f.detail.trim() || f.note.trim() || f.state);
  block.fields = [...rows, ...written, ...(team ? [team] : [])];
  block.removedFields = undefined;
  block.templateVersion = TEMPLATE_VERSION;
}

export function withCatalogFields(block: BriefBlock): BriefBlock {
  const current = catalogBlock(block.key)?.name;
  if (current && RENAMED_BLOCKS[block.key]?.includes(block.name)) block.name = current;
  block.status = normalizeBlockStatus(block.status);
  dropRetiredFields(block);
  const required = requiredFields(block);
  if (required.length === 0) return block;
  block.fields = block.fields.map((f) => ({ ...f, label: RENAMED_FIELDS[f.label] ?? f.label }));
  if ((block.templateVersion ?? 0) < TEMPLATE_VERSION) reshapeToTemplate(block, required);
  const have = new Set(block.fields.map((f) => f.label));
  const removed = new Set(block.removedFields ?? []);
  const missing = required.filter((label) => !have.has(label) && !removed.has(label));
  block.fields.push(...missing.map((label) => ({ label, detail: "", note: "" })));
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
  customMoments: [],
  hiddenMoments: [],
});

export interface MusicMoment {
  key: string;
  label: string;
  custom: boolean;
}

/**
 * Effective song moments: defaults minus hidden ones, plus custom moments in their group (new groups go last). Empty groups are dropped.
 * Inside each group, moments follow the dragged `order`; moments not in it keep their place after the ordered ones.
 */
export function musicMoments(music: Pick<Music, "customMoments" | "hiddenMoments" | "order">): Array<{ group: string; moments: MusicMoment[] }> {
  const hidden = new Set(music.hiddenMoments ?? []);
  const groups = SONG_MOMENTS.map((g) => ({
    group: g.group,
    moments: g.moments.filter((m) => !hidden.has(m.key)).map((m) => ({ ...m, custom: false })),
  }));
  for (const m of music.customMoments ?? []) {
    let group = groups.find((g) => g.group.toLowerCase() === m.group.toLowerCase());
    if (!group) groups.push((group = { group: m.group, moments: [] }));
    group.moments.push({ key: m.key, label: m.label, custom: true });
  }
  const order = music.order ?? [];
  if (order.length > 0) {
    const rank = (key: string) => {
      const i = order.indexOf(key);
      return i === -1 ? order.length : i;
    };
    for (const g of groups) g.moments.sort((a, b) => rank(a.key) - rank(b.key));
  }
  return groups.filter((g) => g.moments.length > 0);
}

export const musicMomentKeys = (music: Pick<Music, "customMoments" | "hiddenMoments" | "order">) =>
  musicMoments(music).flatMap((g) => g.moments.map((m) => m.key));

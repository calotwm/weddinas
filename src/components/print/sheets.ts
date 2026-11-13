/** The printable sheets the team downloads per couple, each at /admin/parejas/<id>/descargas/<slug>. */
export const DOWNLOAD_SHEETS: Array<{ slug: string; title: string; description: string }> = [
  { slug: "proveedores", title: "Proveedores", description: "El brief de cada proveedor confirmado, con su pago según el presupuesto." },
  { slug: "invitados", title: "Invitados", description: "La lista numerada con mesa, menú y estado, y una columna para tomar lista el día del evento." },
  { slug: "presupuesto", title: "Presupuesto", description: "Cada ítem con su total, lo pagado y lo que falta, más los totales." },
  { slug: "timing", title: "Timing", description: "El cronograma del día y el timing de proveedores." },
  { slug: "familia", title: "Fotos familiares", description: "Los familiares de cada lado, con sus fotos." },
  { slug: "musica", title: "Elección de canciones", description: "La canción de cada momento." },
];

export const downloadsPath = (coupleId: string) => `/admin/parejas/${coupleId}/descargas`;

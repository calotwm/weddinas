/** Values the team can drop into the welcome message with `{nombres}`, `{link}` and `{codigo}`. */
export interface WelcomeValues {
  nombres: string;
  link: string;
  codigo: string;
}

export const WELCOME_PLACEHOLDERS: Array<{ token: string; description: string }> = [
  { token: "{nombres}", description: "Los nombres de la pareja" },
  { token: "{link}", description: "El link del portal" },
  { token: "{codigo}", description: "Su código de acceso" },
];

export const WELCOME_TEMPLATE_MAX = 2000;

/** The message the team sent before it became editable. */
export const DEFAULT_WELCOME_TEMPLATE =
  "¡Hola {nombres}! Este es su portal Weddinas, donde van a ver la cuenta regresiva, propuestas, proveedores, pagos, su lista de invitados y el timing del día.\n\nEntren en {link} con el código: {codigo}";

/** Fills the placeholders literally; a blank template falls back to the default text. */
export function renderWelcomeMessage(template: string, values: WelcomeValues): string {
  const text = template.trim() ? template : DEFAULT_WELCOME_TEMPLATE;
  return text.split("{nombres}").join(values.nombres).split("{link}").join(values.link).split("{codigo}").join(values.codigo);
}

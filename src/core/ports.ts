import type { PasswordOverride } from "./team-users";
import type { Couple } from "./couple";
import type { IpcSeries, UsdQuote } from "./money";

export interface CoupleRepository {
  list(): Promise<Couple[]>;
  findById(id: string): Promise<Couple | null>;
  findBySlug(slug: string): Promise<Couple | null>;
  findByAccessCodeHash(hash: string): Promise<Couple | null>;
  save(couple: Couple): Promise<void>;
}

export interface RatesProvider {
  /** Latest INDEC IPC series, or null when unavailable. */
  ipc(): Promise<IpcSeries | null>;
  /** Current dollar quotes, or an empty list when unavailable. */
  usdQuotes(): Promise<UsdQuote[]>;
}

/** Team-wide settings; every field is optional so older files keep working. */
export interface Settings {
  /** Welcome message template with `{nombres}`, `{link}` and `{codigo}`; the default text when missing. */
  welcomeTemplate?: string;
  /** Team members' passwords changed from the app (hashed), keyed by email. */
  teamPasswords?: Record<string, PasswordOverride>;
}

export interface SettingsRepository {
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

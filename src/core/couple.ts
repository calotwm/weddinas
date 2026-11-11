import type { ComparisonTable } from "./comparison-table";
import type { Adjustment, Currency } from "./money";

/** "discarded": another proposal of the same rubro was approved; hidden from the couple, still shown to the team. */
export type ProposalStatus = "pending" | "approved" | "rejected" | "discarded";

export type CommentAuthor = "couple" | "team";

export interface ProposalComment {
  id: string;
  author: CommentAuthor;
  text: string;
  /** ISO time it was written. */
  at: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
}

export interface PublicInfo {
  headline: string;
  story: string;
  venue: string;
  venueAddress: string;
  mapUrl: string;
  dressCode: string;
  giftInfo: string;
  /** Bank alias and CBU/CVU for gifts, shown with copy buttons. Missing on pages saved before they existed. */
  giftAlias?: string;
  giftCbu?: string;
  giftHolder?: string;
  coverImageUrl: string;
  /** Uploaded cover (a file id); served publicly at /boda/<slug>/portada and preferred over coverImageUrl. */
  coverPhotoId?: string | null;
  schedule: ScheduleItem[];
}

/** A file the team attached (image or PDF). `internal` ones are only shown to the team. */
export interface Attachment {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  internal: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  link: string;
  amount: string;
  status: ProposalStatus;
  coupleComment: string;
  createdAt: string;
  respondedAt: string | null;
  /** When the team presented it to the couple; null while it is a draft. Missing on proposals published before drafts existed. */
  presentedAt?: string | null;
  attachments?: Attachment[];
  /** Brief vendor catalog key ("foto", "catering"…); approving one discards the other pending ones of that rubro. */
  category?: string;
  /** Question/answer thread between the couple and the team. */
  comments?: ProposalComment[];
  /** First time the couple opened Propuestas while it was presented. */
  viewedAt?: string | null;
  /** Vendor comparison table parsed from the agency's Excel; its original file is kept apart. */
  comparison?: ComparisonTable | null;
}

export interface Report {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface ChecklistTask {
  id: string;
  title: string;
  done: boolean;
  /** "YYYY-MM": month the task belongs to in the monthly checklist. Missing on tasks without a month. */
  month?: string;
}

export type PaymentKind = "sena" | "saldo" | "adicional" | "iva";

export interface Payment {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  amount: number;
  currency: Currency;
  /** Exchange rate used when the payment currency differs from the item's. */
  arsPerUsd: number | null;
  kind: PaymentKind;
  note: string;
}

export interface BudgetItem {
  id: string;
  /** Brief category key (see brief-catalog). */
  category: string;
  vendor: string;
  concept: string;
  amount: number;
  currency: Currency;
  adjustment: Adjustment;
  /** "YYYY-MM": month the amount was agreed; IPC adjustment starts there. */
  baseMonth: string;
  note: string;
  /** "YYYY-MM-DD": next payment due date, used for the pending payments card and alerts. Optional. */
  dueDate?: string;
  payments: Payment[];
}

export interface Budget {
  /** Dollar quote used for conversions (dolarapi "casa", e.g. "blue", "oficial", "bolsa"). */
  usdQuote: string;
  guests: number | null;
  items: BudgetItem[];
}

export type BlockStatus = "searching" | "deciding" | "confirmed" | "na";

/** Who a brief line is waiting on, as the agency colors it: violet, yellow, orange, green. */
export type LineState = "weddinas" | "couple" | "vendor" | "confirmed";

export const LINE_STATES: { value: LineState; label: string }[] = [
  { value: "weddinas", label: "Pendiente Weddinas" },
  { value: "couple", label: "Pendiente novios" },
  { value: "vendor", label: "Pendiente proveedor" },
  { value: "confirmed", label: "Confirmado" },
];

export const isLineState = (value: unknown): value is LineState => LINE_STATES.some((s) => s.value === value);

export interface BriefField {
  label: string;
  detail: string;
  note: string;
  /** Unset while nobody marked the line. */
  state?: LineState;
}

/** One section of the planner brief: event data (civil, ceremony…) or one vendor category. */
export interface BriefBlock {
  key: string;
  name: string;
  kind: "event" | "vendor";
  vendor: string;
  contact: string;
  status: BlockStatus;
  /** Team member in charge ("Equipo" in the Excel brief). */
  owner: string;
  fields: BriefField[];
  attachments?: Attachment[];
  /** When the block last became "confirmed"; drives the couple's vendor notification. Unset while not confirmed. */
  confirmedAt?: string | null;
}

export type SongStatus = "chosen" | "pending" | "na";

export interface SongChoice {
  moment: string;
  song: string;
  artist: string;
  status: SongStatus;
  note: string;
}

/** A song moment added by the couple or the team, in a default group or a new one. */
export interface CustomMoment {
  key: string;
  label: string;
  group: string;
}

export interface Music {
  songs: SongChoice[];
  playlistUrl: string;
  mustPlay: string;
  banned: string;
  /** Missing on music saved before moments were editable. */
  customMoments?: CustomMoment[];
  /** Keys of default moments the couple or the team removed. */
  hiddenMoments?: string[];
}

export type FamilySide = "a" | "b";

export interface FamilyMember {
  id: string;
  side: FamilySide;
  name: string;
  relation: string;
  /** Uploaded reference photo so the photographer can recognize them. */
  photoId: string | null;
}

export interface PaletteColor {
  name: string;
  /** "#rrggbb", lowercase. */
  hex: string;
}

/** "Estética": what the couple likes, for the team and vendors (replaces the guest web page in the portal). */
export interface Aesthetic {
  fonts: string;
  palette: PaletteColor[];
  /** Uploaded photos of the couple, served by /archivos to the couple and the team only. */
  photoIds: string[];
}

/** One moment of the wedding day schedule. */
export interface TimingItem {
  id: string;
  /** "HH:MM" (24 h). */
  time: string;
  title: string;
  note: string;
}

export type GuestStatus = "confirmed" | "pending" | "declined";

export interface Guest {
  id: string;
  name: string;
  group: string;
  status: GuestStatus;
  table: string;
  /** Dietary restriction, free text (e.g. "Celíaco"). */
  restriction: string;
}

export interface Couple {
  id: string;
  slug: string;
  partnerA: string;
  partnerB: string;
  weddingDate: string;
  accessCodeHash: string;
  publicInfo: PublicInfo;
  proposals: Proposal[];
  reports: Report[];
  tasks: ChecklistTask[];
  budget: Budget;
  brief: BriefBlock[];
  /** Brief free text: "Ideas generales". */
  ideas: string;
  music: Music;
  family: FamilyMember[];
  /** Missing on couples stored before Estética, Timing and Invitados existed; the service fills defaults on load. */
  aesthetic?: Aesthetic;
  /** Kept sorted by time. */
  timing?: TimingItem[];
  guests?: Guest[];
  /** Last time the couple opened their notifications; newer ones count as unread. */
  notificationsSeenAt?: string | null;
  createdAt: string;
  /** WhatsApp number in international digits ("5491122334455"); the team's buttons open this chat. */
  whatsapp?: string;
}

/** Couple data safe to expose outside the server boundary. */
export type CoupleView = Omit<Couple, "accessCodeHash"> & Required<Pick<Couple, CoupleSection>>;

/** Optional in storage, always present once loaded through the service. */
export type CoupleSection = "aesthetic" | "timing" | "guests";

export type PublicPage = Pick<Couple, "slug" | "partnerA" | "partnerB" | "weddingDate" | "publicInfo">;

export const emptyPublicInfo = (): PublicInfo => ({
  headline: "",
  story: "",
  venue: "",
  venueAddress: "",
  mapUrl: "",
  dressCode: "",
  giftInfo: "",
  giftAlias: "",
  giftCbu: "",
  giftHolder: "",
  coverImageUrl: "",
  schedule: [],
});

/** Drafts stay hidden from the couple until the team presents them. */
export const isPresented = (p: Pick<Proposal, "presentedAt">) => p.presentedAt !== null;

export const coupleNames = (c: Pick<Couple, "partnerA" | "partnerB">) => `${c.partnerA} & ${c.partnerB}`;

export interface ChecklistSections {
  /** Open tasks of months already gone ("Pendientes de meses anteriores"). */
  overdue: ChecklistTask[];
  thisMonth: ChecklistTask[];
  upcoming: Array<{ month: string; tasks: ChecklistTask[] }>;
  noMonth: ChecklistTask[];
  /** Finished tasks of past months. */
  pastDone: ChecklistTask[];
}

/** Monthly cover of the checklist relative to `month` ("YYYY-MM"); keeps the stored order inside each month. */
export function checklistSections(tasks: ChecklistTask[], month: string): ChecklistSections {
  const byMonth = (a: ChecklistTask, b: ChecklistTask) => a.month!.localeCompare(b.month!);
  const past = tasks.filter((t) => t.month && t.month < month).sort(byMonth);
  const later = tasks.filter((t) => t.month && t.month > month).sort(byMonth);
  const upcoming: ChecklistSections["upcoming"] = [];
  for (const t of later) {
    if (upcoming.at(-1)?.month !== t.month) upcoming.push({ month: t.month!, tasks: [] });
    upcoming.at(-1)!.tasks.push(t);
  }
  return {
    overdue: past.filter((t) => !t.done),
    thisMonth: tasks.filter((t) => t.month === month),
    upcoming,
    noMonth: tasks.filter((t) => !t.month),
    pastDone: past.filter((t) => t.done),
  };
}

export type ProposalStatus = "pending" | "approved" | "rejected";

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
  coverImageUrl: string;
  schedule: ScheduleItem[];
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
}

export interface Report {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ChecklistTask {
  id: string;
  title: string;
  done: boolean;
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
  createdAt: string;
}

/** Couple data safe to expose outside the server boundary. */
export type CoupleView = Omit<Couple, "accessCodeHash">;

export type PublicPage = Pick<Couple, "slug" | "partnerA" | "partnerB" | "weddingDate" | "publicInfo">;

export const emptyPublicInfo = (): PublicInfo => ({
  headline: "",
  story: "",
  venue: "",
  venueAddress: "",
  mapUrl: "",
  dressCode: "",
  giftInfo: "",
  coverImageUrl: "",
  schedule: [],
});

export const coupleNames = (c: Pick<Couple, "partnerA" | "partnerB">) => `${c.partnerA} & ${c.partnerB}`;

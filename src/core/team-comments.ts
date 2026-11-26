/**
 * The team's comments on brief rubros. `@Name` mentions a team member (named after their login email) and shows up
 * in their panel bell until they see it, and in their list of pending mentions until they mark it done.
 */
import type { CoupleView, TeamComment } from "./couple";

export const TEAM_COMMENT_MAX = 2000;

export class TeamCommentError extends Error {}

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "canela.r@weddinas.com" → "Canela": the first word of the email's local part. */
export function memberName(email: string): string {
  const first = email.split("@")[0].split(/[._+-]/).find(Boolean) ?? email;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** The members `@Name` mentions in the text, in member order; an email address is not a mention. */
export function parseMentions(text: string, members: string[]): string[] {
  const names = new Set([...fold(text).matchAll(/(?:^|[^\p{L}\p{N}.@])@([\p{L}\p{N}]+)/gu)].map((m) => m[1]));
  return members.filter((email) => names.has(fold(memberName(email))));
}

export interface Mention {
  coupleId: string;
  coupleName: string;
  blockKey: string;
  blockName: string;
  comment: TeamComment;
  seen: boolean;
  done: boolean;
}

/** The comments that mention the member, pending ones first, newest first within each group. */
export function mentionsFor(couples: CoupleView[], member: string): Mention[] {
  return couples
    .flatMap((couple) =>
      couple.teamComments
        .filter((comment) => comment.mentions.includes(member))
        .map((comment) => ({
          coupleId: couple.id,
          coupleName: `${couple.partnerA} & ${couple.partnerB}`,
          blockKey: comment.blockKey,
          blockName: couple.brief.find((b) => b.key === comment.blockKey)?.name ?? "Rubro quitado",
          comment,
          seen: comment.seenBy.includes(member),
          done: comment.doneBy.includes(member),
        })),
    )
    .sort((a, b) => Number(a.done) - Number(b.done) || b.comment.at.localeCompare(a.comment.at));
}

"use server";

import { revalidatePath } from "next/cache";
import { memberName, mentionsFor, TEAM_COMMENT_MAX, TeamCommentError } from "@/core/team-comments";
import { currentTeamUser, requireAdmin, teamMembers } from "@/server/auth";
import { portal } from "@/server/container";

export type CommentResult = { error?: string; ok?: number } | null;

const text = (formData: FormData, key: string, max = 100) => String(formData.get(key) ?? "").trim().slice(0, max);

export async function addTeamComment(_prev: CommentResult, formData: FormData): Promise<CommentResult> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId");
  try {
    const author = (await currentTeamUser()) ?? "";
    await portal.addTeamComment(coupleId, text(formData, "blockKey", 60), author, String(formData.get("text") ?? "").slice(0, TEAM_COMMENT_MAX + 1), teamMembers());
  } catch (e) {
    if (e instanceof TeamCommentError) return { error: e.message };
    return { error: "No se pudo guardar el comentario. Probá de nuevo." };
  }
  revalidatePath(`/admin/parejas/${coupleId}/brief`);
  return { ok: Date.now() };
}

export async function deleteTeamComment(formData: FormData): Promise<void> {
  await requireAdmin();
  const coupleId = text(formData, "coupleId");
  await portal.deleteTeamComment(coupleId, text(formData, "commentId"), (await currentTeamUser()) ?? "");
  revalidatePath(`/admin/parejas/${coupleId}/brief`);
}

export async function setMentionDone(formData: FormData): Promise<void> {
  await requireAdmin();
  const me = await currentTeamUser();
  if (!me) return;
  await portal.setMentionDone(text(formData, "coupleId"), text(formData, "commentId"), me, formData.get("done") === "1");
  revalidatePath("/admin/menciones");
}

export async function markMentionsSeen(): Promise<void> {
  await requireAdmin();
  const me = await currentTeamUser();
  if (me) await portal.markMentionsSeen(me);
}

export interface MentionStatus {
  unseen: number;
  /** The newest unseen mention, for the pop-up. */
  latest: { id: string; who: string; where: string; text: string } | null;
}

/** What the panel bell shows; polled by the browser. */
export async function mentionStatus(): Promise<MentionStatus> {
  await requireAdmin();
  const me = await currentTeamUser();
  if (!me) return { unseen: 0, latest: null };
  const unseen = mentionsFor(await portal.listCouples(), me).filter((m) => !m.seen);
  const newest = [...unseen].sort((a, b) => b.comment.at.localeCompare(a.comment.at))[0];
  return {
    unseen: unseen.length,
    latest: newest
      ? { id: newest.comment.id, who: newest.comment.author ? memberName(newest.comment.author) : "El equipo", where: `${newest.blockName} · ${newest.coupleName}`, text: newest.comment.text.slice(0, 140) }
      : null,
  };
}

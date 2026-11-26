"use client";

import { useActionState, useEffect, useRef } from "react";
import { addTeamComment, deleteTeamComment } from "@/app/admin/comment-actions";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import type { TeamComment } from "@/core/couple";
import { TEAM_COMMENT_MAX } from "@/core/team-comments";

export interface CommentMember {
  email: string;
  name: string;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/** "@Canela" in bold inside a comment's text. */
function CommentText({ text, names }: { text: string; names: string[] }) {
  const pattern = names.length ? new RegExp(`(@(?:${names.join("|")}))(?![\\p{L}\\p{N}])`, "giu") : null;
  const parts = pattern ? text.split(pattern) : [text];
  return (
    <p className="text-sm whitespace-pre-line">
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-teal">{part}</strong> : part))}
    </p>
  );
}

/** The team's comments on one rubro, with `@Name` mentions that notify those members in the panel. */
export function BriefComments({
  coupleId,
  blockKey,
  comments,
  members,
  me,
}: {
  coupleId: string;
  blockKey: string;
  comments: TeamComment[];
  members: CommentMember[];
  me: string | null;
}) {
  const [state, action] = useActionState(addTeamComment, null);
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const nameOf = (email: string) => members.find((m) => m.email === email)?.name ?? (email ? email.split("@")[0] : "El equipo");

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  const mention = (name: string) => {
    const el = box.current;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    const after = el.value.slice(el.selectionEnd);
    const insert = `${before && !/\s$/.test(before) ? " " : ""}@${name} `;
    el.value = before + insert + after;
    const caret = (before + insert).length;
    el.focus();
    el.setSelectionRange(caret, caret);
  };

  return (
    <div id={`comentarios-${blockKey}`} className="space-y-3 rounded-xl bg-sand/40 p-4">
      <p className="label flex items-center gap-2">
        <Icon name="chat" className="h-4 w-4 text-teal" />
        Comentarios del equipo{comments.length > 0 && ` (${comments.length})`}
      </p>
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-white p-3 ring-1 ring-forest/5">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink/55">
                <span className="font-semibold text-forest">{nameOf(c.author)}</span>
                <span>{when(c.at)}</span>
                {c.mentions.length > 0 && <span>· para {c.mentions.map(nameOf).join(", ")}{c.doneBy.length > 0 && ` · hecho por ${c.doneBy.map(nameOf).join(", ")}`}</span>}
                {me !== null && c.author === me && (
                  <form action={deleteTeamComment} className="ml-auto">
                    <input type="hidden" name="coupleId" value={coupleId} />
                    <input type="hidden" name="commentId" value={c.id} />
                    <SubmitButton className="text-ink/40 hover:text-rust" pendingText="…" confirm="¿Borrar este comentario?">
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      <span className="sr-only">Borrar comentario</span>
                    </SubmitButton>
                  </form>
                )}
              </div>
              <CommentText text={c.text} names={members.map((m) => m.name)} />
            </li>
          ))}
        </ul>
      )}
      <form ref={form} action={action} className="space-y-2">
        <input type="hidden" name="coupleId" value={coupleId} />
        <input type="hidden" name="blockKey" value={blockKey} />
        <label htmlFor={`comment-${blockKey}`} className="sr-only">Nuevo comentario</label>
        <textarea
          ref={box}
          id={`comment-${blockKey}`}
          name="text"
          rows={2}
          maxLength={TEAM_COMMENT_MAX}
          required
          className="field"
          placeholder={members.length ? `Escribí un comentario. Con @${members[0].name} le avisás a esa persona.` : "Escribí un comentario."}
        />
        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 && <span className="text-xs text-ink/55">Mencionar:</span>}
          {members.map((m) => (
            <button key={m.email} type="button" onClick={() => mention(m.name)} className="chip bg-white text-teal ring-1 ring-teal/20 hover:bg-teal/10">
              @{m.name}
            </button>
          ))}
          <SubmitButton className="btn-primary btn-sm ml-auto" pendingText="Enviando…">
            Comentar
          </SubmitButton>
        </div>
        {state?.error && <p className="text-sm text-rust" role="alert">{state.error}</p>}
      </form>
    </div>
  );
}

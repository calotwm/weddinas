import type { CommentAuthor, ProposalComment } from "@/core/couple";
import { formatShortDate } from "@/lib/format";

/** The question/answer thread of one proposal; `viewer` decides which side reads as "you". */
export function CommentThread({ comments, viewer }: { comments: ProposalComment[] | undefined; viewer: CommentAuthor }) {
  if (!comments?.length) return null;
  const who = (author: CommentAuthor) =>
    author === viewer ? (viewer === "couple" ? "Ustedes" : "Vos (equipo)") : author === "team" ? "Equipo Weddinas" : "Los novios";
  return (
    <ol className="space-y-2">
      {comments.map((c) => (
        <li
          key={c.id}
          className={`rounded-2xl px-4 py-3 text-sm ${c.author === viewer ? "ml-6 bg-sand text-ink/80" : "mr-6 bg-peach-soft text-ink/80"}`}
        >
          <p className="text-xs font-semibold text-teal">
            {who(c.author)} · {formatShortDate(c.at)}
          </p>
          <p className="mt-1 whitespace-pre-line">{c.text}</p>
        </li>
      ))}
    </ol>
  );
}

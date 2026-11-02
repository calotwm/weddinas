import type { ReactNode } from "react";
import type { Attachment } from "@/core/couple";
import { Icon } from "./icons";

const fileUrl = (coupleId: string, id: string) => `/archivos/${coupleId}/${id}`;
const isPdf = (a: Attachment) => a.id.endsWith(".pdf");

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Images as thumbnails, PDFs as links; each opens in a new tab. `action` renders team-only controls per file. */
export function AttachmentList({
  coupleId,
  attachments,
  includeInternal = false,
  action,
}: {
  coupleId: string;
  attachments: Attachment[] | undefined;
  includeInternal?: boolean;
  action?: (attachment: Attachment) => ReactNode;
}) {
  const visible = (attachments ?? []).filter((a) => includeInternal || !a.internal);
  if (visible.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {visible.map((a) => (
        <li key={a.id} className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-forest/10">
          <a href={fileUrl(coupleId, a.id)} target="_blank" rel="noopener" className="block">
            {isPdf(a) ? (
              <span className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-peach-soft text-rust">
                <Icon name="file" className="h-8 w-8" />
                <span className="text-xs font-semibold">PDF</span>
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- private files are served by our own route, not next/image
              <img src={fileUrl(coupleId, a.id)} alt={a.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            )}
            <span className="block truncate px-3 pt-2 text-xs font-semibold text-forest" title={a.name}>{a.name}</span>
            <span className="block px-3 pb-2 text-[11px] text-ink/50">
              {size(a.size)}
              {a.internal && " · solo equipo"}
            </span>
          </a>
          {action && <div className="absolute top-2 right-2">{action(a)}</div>}
        </li>
      ))}
    </ul>
  );
}

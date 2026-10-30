/* eslint-disable @next/next/no-img-element -- private uploads are served by our own authenticated route */
import type { FamilyMember, FamilySide } from "@/core/couple";
import { Icon } from "../icons";

export const photoUrl = (coupleId: string, photoId: string) => `/archivos/${coupleId}/${photoId}`;

export function FamilyPhoto({ coupleId, member, className = "h-16 w-16" }: { coupleId: string; member: FamilyMember; className?: string }) {
  return member.photoId ? (
    <img src={photoUrl(coupleId, member.photoId)} alt={`Foto de ${member.name}`} className={`${className} shrink-0 rounded-2xl object-cover ring-1 ring-forest/10`} />
  ) : (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-sand text-ink/30`} aria-hidden>
      <Icon name="users" className="h-6 w-6" />
    </span>
  );
}

/** Family members in two columns, one per partner; `action` renders extra controls per member. */
export function FamilyColumns({
  coupleId,
  family,
  sides,
  action,
}: {
  coupleId: string;
  family: FamilyMember[];
  sides: Record<FamilySide, string>;
  action?: (member: FamilyMember) => React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {(Object.keys(sides) as FamilySide[]).map((side) => {
        const members = family.filter((m) => m.side === side);
        return (
          <section key={side} className="card space-y-4">
            <h3 className="section-title">Familia de {sides[side]}</h3>
            {members.length === 0 && <p className="text-sm text-ink/50">Todavía no hay nadie cargado.</p>}
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-4 rounded-2xl p-2 ring-1 ring-forest/5">
                  <FamilyPhoto coupleId={coupleId} member={m} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-forest">{m.name}</p>
                    {m.relation && <p className="text-sm text-ink/60">{m.relation}</p>}
                  </div>
                  {action?.(m)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { Icon } from "@/components/icons";
import { PrintButton } from "@/components/print-button";
import { coupleNames, type CoupleView } from "@/core/couple";
import { formatWeddingDate } from "@/lib/format";

/** Printable page: a heading with the couple, a "Descargar PDF" button and the content; print CSS keeps only this sheet. */
export function PrintSheet({ couple, title, back, children }: { couple: CoupleView; title: string; back: string; children: React.ReactNode }) {
  return (
    <div className="print-sheet space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={back} className="inline-flex items-center gap-2 text-sm text-teal hover:underline">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Volver
        </Link>
        <PrintButton />
      </div>
      <header className="border-b border-forest/10 pb-4">
        <p className="eyebrow">Weddinas · {coupleNames(couple)}</p>
        <h2 className="font-display text-4xl text-forest">{title}</h2>
        <p className="text-sm text-ink/60 first-letter:uppercase">{formatWeddingDate(couple.weddingDate)}</p>
      </header>
      {children}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/brand";
import { Countdown } from "@/components/countdown";
import { coupleNames } from "@/core/couple";
import { formatWeddingDate, weddingDateToIso } from "@/lib/format";
import { ensureDemoData, portal } from "@/server/container";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  await ensureDemoData();
  return portal.getPublicPage(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  return { title: page ? `${coupleNames(page)} · Weddinas` : "Weddinas" };
}

export default async function WeddingPage({ params }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();

  const { publicInfo: info } = page;

  return (
    <div className="min-h-screen">
      <header className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4 py-20 text-center">
        {info.coverImageUrl && (
          <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${info.coverImageUrl})` }} />
        )}
        <div aria-hidden className={`absolute inset-0 ${info.coverImageUrl ? "bg-forest/65" : "bg-forest"}`} />
        <div className="relative max-w-3xl">
          <p className="font-script text-5xl text-peach sm:text-6xl">{info.headline || "¡Nos casamos!"}</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-white sm:text-7xl">{coupleNames(page)}</h1>
          <p className="mt-4 mb-10 text-sm tracking-[0.25em] text-peach uppercase">{formatWeddingDate(page.weddingDate)}</p>
          <Countdown date={weddingDateToIso(page.weddingDate)} tone="light" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-16 px-4 py-16 sm:px-6">
        {info.story && (
          <section className="text-center">
            <p className="eyebrow">Nuestra historia</p>
            <p className="mx-auto mt-4 max-w-2xl font-display text-2xl leading-relaxed whitespace-pre-line text-forest">{info.story}</p>
          </section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {(info.venue || info.venueAddress) && (
            <section className="card">
              <p className="eyebrow">Dónde</p>
              <h2 className="mt-2 font-display text-3xl text-forest">{info.venue}</h2>
              <p className="mt-1 text-ink/70">{info.venueAddress}</p>
              {info.mapUrl && (
                <a href={info.mapUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6">Cómo llegar</a>
              )}
            </section>
          )}

          {info.schedule.length > 0 && (
            <section className="card">
              <p className="eyebrow">Cronograma</p>
              <ul className="mt-4 space-y-3">
                {info.schedule.map((item, i) => (
                  <li key={i} className="flex items-baseline gap-4">
                    <span className="w-14 shrink-0 font-display text-xl text-rust">{item.time}</span>
                    <span className="text-lg">{item.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {info.dressCode && (
            <section className="card bg-peach">
              <p className="eyebrow text-forest">Dress code</p>
              <p className="mt-2 font-display text-2xl text-forest">{info.dressCode}</p>
            </section>
          )}

          {info.giftInfo && (
            <section className="card">
              <p className="eyebrow">Regalos</p>
              <p className="mt-2 whitespace-pre-line text-ink/80">{info.giftInfo}</p>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

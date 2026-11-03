import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/brand";
import { CopyButton } from "@/components/copy-button";
import { Countdown } from "@/components/countdown";
import { Icon, type IconName } from "@/components/icons";
import { coupleNames } from "@/core/couple";
import { coverCss, mapEmbedUrl } from "@/core/url";
import { siteOrigin } from "@/server/site-url";
import { formatWeddingDate, weddingDateToIso } from "@/lib/format";
import { ensureDemoData, portal } from "@/server/container";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  await ensureDemoData();
  return portal.getPublicPage(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return { title: "Weddinas" };
  return {
    title: `${coupleNames(page)} · ¡Nos casamos!`,
    description: `${formatWeddingDate(page.weddingDate)}${page.publicInfo.venue ? ` · ${page.publicInfo.venue}` : ""}`,
    openGraph: page.publicInfo.coverPhotoId
      ? { images: [`${await siteOrigin()}/boda/${page.slug}/portada?v=${page.publicInfo.coverPhotoId}`] }
      : page.publicInfo.coverImageUrl
        ? { images: [page.publicInfo.coverImageUrl] }
        : undefined,
  };
}

function InfoCard({ icon, title, children, className = "" }: { icon: IconName; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-5 flex items-center gap-3 border-b border-forest/10 pb-4">
        <span className="icon-badge"><Icon name={icon} /></span>
        <h2 className="font-display text-2xl text-forest sm:text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function GiftRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream/70 px-4 py-3 ring-1 ring-forest/5">
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-forest">{label}</dt>
        <dd className="font-mono text-base break-all text-forest">{value}</dd>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

export default async function WeddingPage({ params }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();

  const { publicInfo: info } = page;
  const cover = coverCss(page.slug, info);
  const hasCover = cover !== "none";
  const mapEmbed = mapEmbedUrl(info);
  const place = [info.venue, info.venueAddress].filter(Boolean).join(", ");
  const directions = info.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

  return (
    <div className="min-h-screen">
      <header className="relative flex min-h-[92svh] items-center justify-center overflow-hidden px-4 py-24 text-center">
        {hasCover && (
          <div aria-hidden className="absolute inset-0 scale-105 bg-cover bg-center" style={{ backgroundImage: cover }} />
        )}
        <div aria-hidden className={`absolute inset-0 ${hasCover ? "bg-gradient-to-b from-ink/50 via-forest/55 to-forest/90" : "bg-forest"}`} />
        <div className="relative max-w-3xl">
          <p className="font-script text-5xl text-peach sm:text-7xl">{info.headline || "¡Nos casamos!"}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] text-white sm:text-8xl">{coupleNames(page)}</h1>
          <div className="mx-auto my-8 h-px w-24 bg-peach/60" />
          <p className="mb-10 text-sm tracking-[0.3em] text-cream uppercase">{formatWeddingDate(page.weddingDate)}</p>
          <Countdown date={weddingDateToIso(page.weddingDate)} tone="light" />
        </div>
        <a href="#detalles" aria-label="Ver detalles" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/70 transition-colors hover:text-peach">
          <Icon name="arrowRight" className="h-6 w-6 rotate-90" />
        </a>
      </header>

      <main id="detalles" className="mx-auto max-w-5xl space-y-16 px-4 py-20 sm:px-6">
        {info.story && (
          <section className="text-center">
            <p className="font-script text-4xl text-rust">Nuestra historia</p>
            <p className="mx-auto mt-4 max-w-2xl font-display text-2xl leading-relaxed whitespace-pre-line text-forest sm:text-3xl">
              {info.story}
            </p>
          </section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {mapEmbed && (
            <InfoCard icon="map" title="Dónde" className="md:col-span-2">
              <div className="grid gap-6 md:grid-cols-[1fr_1.6fr] md:items-center">
                <div>
                  <h3 className="font-display text-2xl text-forest">{info.venue}</h3>
                  <p className="mt-1 text-lg text-ink/80">{info.venueAddress}</p>
                  <a href={directions} target="_blank" rel="noreferrer noopener" className="btn-primary mt-6">
                    <Icon name="map" className="h-4 w-4" />
                    Cómo llegar
                  </a>
                </div>
                <iframe
                  title={`Mapa de ${info.venue || info.venueAddress}`}
                  src={mapEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-[4/3] w-full rounded-2xl border-0 bg-sand ring-1 ring-forest/10"
                />
              </div>
            </InfoCard>
          )}

          {info.schedule.length > 0 && (
            <InfoCard icon="clock" title="Cronograma" className="md:row-span-2">
              <ol className="relative space-y-4 border-l border-mint/50 pl-5">
                {info.schedule.map((item, i) => (
                  <li key={i} className="relative">
                    <span aria-hidden className="absolute top-2 -left-[25px] h-2.5 w-2.5 rounded-full bg-rust" />
                    <p className="font-display text-lg text-rust">{item.time}</p>
                    <p className="text-lg text-ink">{item.title}</p>
                  </li>
                ))}
              </ol>
            </InfoCard>
          )}

          {info.dressCode && (
            <InfoCard icon="shirt" title="Dress code" className="bg-peach-soft">
              <p className="text-lg text-ink">{info.dressCode}</p>
            </InfoCard>
          )}

          {(info.giftInfo || info.giftAlias || info.giftCbu) && (
            <InfoCard icon="gift" title="Regalos">
              {info.giftInfo && <p className="text-lg whitespace-pre-line text-ink">{info.giftInfo}</p>}
              {(info.giftAlias || info.giftCbu) && (
                <dl className="mt-4 space-y-3">
                  {info.giftAlias && <GiftRow label="Alias" value={info.giftAlias} />}
                  {info.giftCbu && <GiftRow label="CBU / CVU" value={info.giftCbu} />}
                </dl>
              )}
              {info.giftHolder && <p className="mt-3 text-ink/80">A nombre de <strong className="text-forest">{info.giftHolder}</strong></p>}
            </InfoCard>
          )}
        </div>

        <p className="text-center font-script text-4xl text-forest">¡Los esperamos!</p>
      </main>
      <SiteFooter />
    </div>
  );
}

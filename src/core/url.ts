/** Returns the normalized URL when it is a valid http(s) URL, otherwise an empty string. */
export function safeHttpUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

/** CSS `url()` value for user-provided images. URL parsing percent-encodes quotes, so the value cannot escape. */
export function cssUrl(value: string): string {
  const url = safeHttpUrl(value);
  return url ? `url("${url.replace(/["\\\n\r]/g, encodeURIComponent)}")` : "none";
}

/** CSS background for a couple's cover: their uploaded photo (served at /boda/<slug>/portada) or else the pasted link. */
export function coverCss(slug: string, info: { coverPhotoId?: string | null; coverImageUrl: string }): string {
  if (info.coverPhotoId) return `url("/boda/${encodeURIComponent(slug)}/portada?v=${encodeURIComponent(info.coverPhotoId)}")`;
  return cssUrl(info.coverImageUrl);
}

/** Google Maps embed for the venue (no API key needed): searches "venue, address", or "" when neither is set. */
export function mapEmbedUrl(info: { venue: string; venueAddress: string }): string {
  const place = [info.venue, info.venueAddress].map((s) => s.trim()).filter(Boolean).join(", ");
  return place ? `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed` : "";
}

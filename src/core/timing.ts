/** The wedding day starts at 06:00: earlier hours belong to the night that runs past midnight. */
const DAY_START_MIN = 6 * 60;

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Minutes since the start of the wedding day, so "00:30" comes after "23:00". */
const dayMinutes = (time: string) => {
  const min = minutesOf(time);
  return min < DAY_START_MIN ? min + 24 * 60 : min;
};

export const byDayTime = (a: { time: string }, b: { time: string }) => dayMinutes(a.time) - dayMinutes(b.time);

/** "1 h", "30 min", "1 h 30 min", as the agency writes durations. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** How long each moment lasts: until the next one. The last moment, and moments sharing a time with the next, get null. */
export function timingDurations(items: { time: string }[]): (string | null)[] {
  return items.map((item, i) => {
    const next = items[i + 1];
    if (!next) return null;
    const diff = (minutesOf(next.time) - minutesOf(item.time) + 24 * 60) % (24 * 60);
    return diff ? formatDuration(diff) : null;
  });
}

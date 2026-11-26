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

/** "17:30", "9:05" or "17.30" on a 24-hour clock as "HH:MM"; null for anything else (am/pm included). */
export function normalizeClock(value: string): string | null {
  const match = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(value.trim());
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

/** A typed duration as the sheet's "Horas" and "Minutos" columns; nulls when there is none. */
export function durationParts(minutes: number | undefined): { hours: number | null; minutes: number | null } {
  return minutes === undefined ? { hours: null, minutes: null } : { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/** The "Duración" column: the typed duration, else the time until the next moment (null when there is none). */
export function timingDurationLabels(items: { time: string; durationMin?: number }[]): (string | null)[] {
  const untilNext = timingDurations(items);
  return items.map((item, i) => (item.durationMin === undefined ? untilNext[i] : item.durationMin ? formatDuration(item.durationMin) : null));
}

/** Where the next moment starts, as in the sheet: the last moment's time plus its typed duration; "" without one. */
export function nextTimingTime(items: { time: string; durationMin?: number }[]): string {
  const last = items.at(-1);
  if (!last?.durationMin) return "";
  const end = (minutesOf(last.time) + last.durationMin) % (24 * 60);
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

/** The couple's timing: without team-only moments or the team columns. */
export function coupleTiming<T extends { teamOnly?: boolean; team?: Record<string, string> }>(items: T[]): Omit<T, "team">[] {
  return items
    .filter((t) => !t.teamOnly)
    .map((t) => {
      const rest = { ...t };
      delete rest.team;
      return rest;
    });
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

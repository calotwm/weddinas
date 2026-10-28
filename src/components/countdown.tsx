"use client";

import { useEffect, useState } from "react";
import { getCountdown, type Countdown as CountdownValue } from "@/core/countdown";

const UNITS: Array<[keyof Omit<CountdownValue, "isPast">, string]> = [
  ["days", "días"],
  ["hours", "horas"],
  ["minutes", "min"],
  ["seconds", "seg"],
];

export function Countdown({ date, tone = "dark" }: { date: string; tone?: "dark" | "light" }) {
  // Rendered only after mount so server and client clocks never disagree during hydration.
  const [value, setValue] = useState<CountdownValue | null>(null);

  useEffect(() => {
    const target = new Date(date);
    const tick = () => setValue(getCountdown(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date]);

  const number = tone === "dark" ? "text-forest" : "text-peach";
  const caption = tone === "dark" ? "text-teal" : "text-peach/80";

  if (value?.isPast) {
    return <p className={`font-script text-5xl ${number}`}>¡Llegó el gran día!</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" aria-live="polite">
      {UNITS.map(([key, label]) => (
        <div key={key} className="text-center">
          <div className={`font-display text-4xl tabular-nums sm:text-6xl ${number}`}>
            {value ? String(value[key]).padStart(2, "0") : "--"}
          </div>
          <div className={`mt-1 text-[11px] tracking-[0.2em] uppercase ${caption}`}>{label}</div>
        </div>
      ))}
    </div>
  );
}

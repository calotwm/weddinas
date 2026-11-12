import { LINE_STATES, type LineState } from "@/core/couple";

/** The agency's colors: violet = Weddinas, yellow = couple, orange = vendor, green = confirmed. */
export const LINE_STATE_DOT: Record<LineState, string> = {
  weddinas: "bg-violet-500",
  couple: "bg-yellow-400",
  vendor: "bg-orange-500",
  confirmed: "bg-green-600",
};

export const LINE_STATE_CHIP: Record<LineState, string> = {
  weddinas: "bg-violet-100 text-violet-800",
  couple: "bg-yellow-100 text-yellow-900",
  vendor: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
};

export const lineStateLabel = (state: LineState) => LINE_STATES.find((s) => s.value === state)?.label ?? "";

export function LineStateChip({ state }: { state: LineState }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${LINE_STATE_CHIP[state]}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${LINE_STATE_DOT[state]}`} />
      {lineStateLabel(state)}
    </span>
  );
}

/** Color key shown above the brief so the dots read without hovering. */
export function LineStateLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70" aria-label="Referencias de colores">
      {LINE_STATES.map((s) => (
        <li key={s.value} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${LINE_STATE_DOT[s.value]}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

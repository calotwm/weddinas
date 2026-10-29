// Credit for the studio that built the portal. `light` is for dark backgrounds.
export function MadeBy({ light = true, className = "" }: { light?: boolean; className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-1.5 text-[11px] tracking-wide ${light ? "text-cream/55" : "text-ink/45"} ${className}`}>
      Desarrollado por
      <span className={`inline-flex items-center gap-1 font-semibold ${light ? "text-cream/80" : "text-ink/70"}`}>
        <svg viewBox="350 530 1230 875" aria-hidden className="h-3 w-auto">
          <path
            fill={light ? "#fffaf6" : "#22181c"}
            d="M367 752H535V1120Q535 1248 650 1248Q772 1248 772 1110V752H940V1381H780V1255Q735 1389 585 1389Q367 1389 367 1150Z"
          />
          <path
            fill="#cc007e"
            d="M1280 543H1387L1378 703L1511 614L1565 709L1422 779L1565 850L1511 943L1378 854L1387 1015H1280L1290 854L1157 943L1102 850L1246 779L1102 709L1157 614L1290 703Z"
          />
        </svg>
        urquisoft
      </span>
    </p>
  );
}

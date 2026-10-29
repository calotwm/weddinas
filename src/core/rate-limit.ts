/** Fixed-window, in-memory limiter. Good enough for a single instance; use a shared store when scaling out. */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();
  private lastPrune = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt and returns whether it is allowed. */
  hit(key: string, now = Date.now()): boolean {
    const current = this.windows.get(key);
    if (!current || now - current.start >= this.windowMs) {
      this.prune(now);
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    current.count++;
    return current.count <= this.limit;
  }

  /** Runs at most once per window so many distinct keys stay linear, not quadratic. */
  private prune(now: number): void {
    if (now - this.lastPrune < this.windowMs) return;
    this.lastPrune = now;
    for (const [key, window] of this.windows) {
      if (now - window.start >= this.windowMs) this.windows.delete(key);
    }
  }
}

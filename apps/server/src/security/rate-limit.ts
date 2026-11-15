/**
 * Einfacher Rate-Limiter im Speicher (Security-Review 8b, OWASP A07).
 * Gleitendes Zeitfenster je Schlüssel (z. B. Client-Adresse oder E-Mail). Gilt je Serverprozess –
 * für mehrere Instanzen hinter einem Load Balancer müsste ein gemeinsamer Speicher genutzt werden.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    /** Erlaubte Anfragen je Fenster; 0 = Begrenzung aus. */
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Zählt eine Anfrage; liefert die Wartezeit in Sekunden, wenn das Limit überschritten ist, sonst 0. */
  hit(key: string, now = Date.now()): number {
    if (this.max <= 0) return 0;
    const from = now - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > from);
    if (list.length >= this.max) {
      this.hits.set(key, list);
      return Math.max(1, Math.ceil((list[0]! + this.windowMs - now) / 1000));
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 10_000) this.prune(now);
    return 0;
  }

  private prune(now: number) {
    const from = now - this.windowMs;
    for (const [k, v] of this.hits) if (!v.some((t) => t > from)) this.hits.delete(k);
  }
}

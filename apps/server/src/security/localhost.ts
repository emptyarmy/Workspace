/**
 * Ersteinrichtung nur über localhost (R-06).
 * Geprüft wird ausschließlich die tatsächliche Socket-Adresse der Verbindung –
 * Header wie X-Forwarded-For, X-Real-IP oder Host werden bewusst ignoriert, da sie fälschbar sind.
 */
const LOOPBACK_V4 = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isLoopbackAddress(address: string | undefined | null): boolean {
  if (!address) return false;
  const a = address.trim().toLowerCase();
  if (a === '::1') return true;
  // IPv4-mapped IPv6, z. B. ::ffff:127.0.0.1
  const v4 = a.startsWith('::ffff:') ? a.slice(7) : a;
  const m = LOOPBACK_V4.exec(v4);
  return !!m && m.slice(1).every((o) => Number(o) <= 255);
}

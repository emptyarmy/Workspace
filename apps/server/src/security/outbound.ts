/**
 * Schutz vor Server-Side Request Forgery bei ausgehenden KI-Aufrufen (Security-Review 8b, OWASP A10).
 * Admins hinterlegen die Basis-URL ihrer KI-Module selbst. Lokale Modelle (Ollama, LM Studio auf localhost
 * oder im internen Netz) sind ausdrücklich vorgesehen (ADR-004) und bleiben erlaubt. Gesperrt werden
 * Ziele, die nie ein KI-Dienst sind, über die aber Cloud-Zugangsdaten abgegriffen werden können:
 * link-lokale Adressen inkl. Cloud-Metadaten-Diensten (169.254.0.0/16, fe80::/10, fd00:ec2::254)
 * und die „unbestimmte“ Adresse 0.0.0.0/8 bzw. ::.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export function isBlockedAddress(address: string): boolean {
  let a = address.trim().toLowerCase();
  if (a.startsWith('[') && a.endsWith(']')) a = a.slice(1, -1);
  if (a.startsWith('::ffff:')) a = a.slice(7);
  if (isIP(a) === 4) {
    const [o1, o2] = a.split('.').map(Number);
    return o1 === 0 || (o1 === 169 && o2 === 254);
  }
  if (isIP(a) === 6) {
    if (a === '::' || a === 'fd00:ec2::254') return true;
    return /^fe[89ab][0-9a-f]:/.test(a);
  }
  return false;
}

/** Prüft die Ziel-URL (inkl. DNS-Auflösung). Wirft bei gesperrtem Ziel `Error('blocked_address')`. */
export async function assertAllowedTarget(url: string): Promise<void> {
  const host = new URL(url).hostname;
  if (isBlockedAddress(host)) throw new Error('blocked_address');
  if (isIP(host.replace(/^\[|\]$/g, ''))) return;
  let addresses: { address: string }[] = [];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return; // nicht auflösbar: der eigentliche Aufruf scheitert ohnehin mit „nicht erreichbar“
  }
  if (addresses.some((x) => isBlockedAddress(x.address))) throw new Error('blocked_address');
}

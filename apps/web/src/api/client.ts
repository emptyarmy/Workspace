export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Wird aufgerufen, wenn ein Aufruf mit 401 endet (Sitzung abgelaufen, TC-AUTH-008).
 * Anmelde-Endpunkte sind ausgenommen, dort ist 401 eine normale Antwort.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

/** Verbindungs-ID des Live-Kanals dieses Fensters; geht bei Änderungen mit, damit das eigene Echo erkannt wird. */
let liveConnection: string | null = null;
export function setLiveConnection(id: string | null) {
  liveConnection = id;
}

/** CSRF-Schutz: Der Server verlangt diesen Header bei zustandsändernden Aufrufen. */
const CSRF = { 'X-Requested-With': 'ai-tpi' };

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(method === 'GET' ? {} : CSRF),
        ...(method !== 'GET' && liveConnection ? { 'X-Live-Connection': liveConnection } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: unknown = null;
    if (res.status !== 204) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }
    const error =
      !res.ok && data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : undefined;
    if (res.status === 401 && !path.startsWith('/api/auth/')) onUnauthorized?.();
    return { ok: res.ok, status: res.status, data: res.ok ? (data as T) : (data as T), error };
  } catch {
    return { ok: false, status: 0, data: null, error: 'network' };
  }
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body: unknown = {}) => request<T>('POST', path, body);
export const apiPatch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
export const apiDelete = <T>(path: string) => request<T>('DELETE', path);
export const apiPut = <T>(path: string, body: unknown) => request<T>('PUT', path, body);

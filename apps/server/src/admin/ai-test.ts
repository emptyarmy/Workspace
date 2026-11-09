/** Verbindungstest für KI-Module (Admin-Bereich, Reiter „KI-Konfiguration“). Alle KI-Aufrufe laufen über den Server. */
export const AI_PROVIDERS = [
  'anthropic',
  'openai',
  'azure_openai',
  'ollama',
  'lmstudio',
  'openai_compatible',
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number] | 'rules';

export interface AiTestResult {
  ok: boolean;
  ms: number;
  status?: number;
  error?: 'unreachable' | 'timeout' | 'auth_failed' | 'http_error';
}

export function aiProbe(
  provider: AiProvider,
  baseUrl: string,
  apiKey: string | null,
): { url: string; headers: Record<string, string> } {
  const base = baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = { accept: 'application/json' };
  switch (provider) {
    case 'ollama':
      return { url: `${base}/api/tags`, headers };
    case 'anthropic':
      if (apiKey) headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      return { url: `${base}/v1/models`, headers };
    case 'azure_openai':
      if (apiKey) headers['api-key'] = apiKey;
      return { url: `${base}/openai/models?api-version=2024-10-21`, headers };
    default:
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;
      return { url: `${base}/models`, headers };
  }
}

export async function testAiConnection(m: {
  mode: 'rules' | 'local' | 'cloud';
  provider: string;
  baseUrl: string | null;
  apiKey: string | null;
  timeoutSec: number;
}): Promise<AiTestResult> {
  if (m.mode === 'rules') return { ok: true, ms: 0 };
  if (!m.baseUrl) return { ok: false, ms: 0, error: 'unreachable' };
  const probe = aiProbe(m.provider as AiProvider, m.baseUrl, m.apiKey);
  const started = Date.now();
  try {
    const res = await fetch(probe.url, {
      headers: probe.headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(Math.min(m.timeoutSec, 15) * 1000),
    });
    const ms = Date.now() - started;
    await res.body?.cancel();
    if (res.ok) return { ok: true, ms, status: res.status };
    if (res.status === 401 || res.status === 403)
      return { ok: false, ms, status: res.status, error: 'auth_failed' };
    return { ok: false, ms, status: res.status, error: 'http_error' };
  } catch (err) {
    const ms = Date.now() - started;
    const name = (err as Error).name;
    return {
      ok: false,
      ms,
      error: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'unreachable',
    };
  }
}

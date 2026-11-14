/**
 * KI-Aufrufe für Handlungsempfehlungen (Phase 7). Alle Aufrufe laufen über den Server;
 * der Browser sieht weder API-Schlüssel noch Anbieter-Endpunkte.
 * Unterstützt dieselben Anbieter wie der Verbindungstest (admin/ai-test.ts).
 */
import { z } from 'zod';
import type { AiProvider } from '../admin/ai-test';

export type AiFailure = 'timeout' | 'unreachable' | 'auth_failed' | 'http_error' | 'invalid_response';

export class AiError extends Error {
  constructor(
    public readonly code: AiFailure,
    public readonly status?: number,
    detail?: string,
  ) {
    super(detail ?? code);
  }
}

export interface LlmModule {
  provider: string;
  baseUrl: string | null;
  model: string | null;
  temperature: number;
  maxTokens: number;
  timeoutSec: number;
}

export interface LlmMessages {
  system: string;
  user: string;
}

const DEFAULT_BASE: Partial<Record<AiProvider, string>> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
};

/** Ziel-URL, Header und Body je Anbieter. */
export function llmRequest(
  m: LlmModule,
  apiKey: string | null,
  msg: LlmMessages,
): { url: string; headers: Record<string, string>; body: unknown } {
  const provider = m.provider as AiProvider;
  const base = (m.baseUrl || DEFAULT_BASE[provider] || '').replace(/\/+$/, '');
  if (!base) throw new AiError('unreachable', undefined, 'no_base_url');
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
  const chat = [
    { role: 'system', content: msg.system },
    { role: 'user', content: msg.user },
  ];
  switch (provider) {
    case 'anthropic':
      if (apiKey) headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      return {
        url: `${base}/v1/messages`,
        headers,
        body: {
          model: m.model,
          max_tokens: m.maxTokens,
          temperature: m.temperature,
          system: msg.system,
          messages: [{ role: 'user', content: msg.user }],
        },
      };
    case 'azure_openai':
      if (apiKey) headers['api-key'] = apiKey;
      return {
        url: `${base}/openai/deployments/${encodeURIComponent(m.model ?? '')}/chat/completions?api-version=2024-10-21`,
        headers,
        body: {
          messages: chat,
          temperature: m.temperature,
          max_tokens: m.maxTokens,
          response_format: { type: 'json_object' },
        },
      };
    case 'ollama':
      return {
        url: `${base}/api/chat`,
        headers,
        body: {
          model: m.model,
          messages: chat,
          stream: false,
          format: 'json',
          options: { temperature: m.temperature, num_predict: m.maxTokens },
        },
      };
    default:
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;
      return {
        url: `${base}/chat/completions`,
        headers,
        body: {
          model: m.model,
          messages: chat,
          temperature: m.temperature,
          max_tokens: m.maxTokens,
          ...(provider === 'openai' ? { response_format: { type: 'json_object' } } : {}),
        },
      };
  }
}

/** Antworttext aus der Anbieter-Antwort lesen. */
export function llmText(provider: string, json: unknown): string {
  type Part = { type?: string; text?: string };
  const j = (json ?? {}) as {
    content?: Part[];
    message?: { content?: unknown };
    choices?: { message?: { content?: unknown } }[];
  };
  let t: unknown;
  if (provider === 'anthropic')
    t = Array.isArray(j.content)
      ? j.content
          .filter((c) => c?.type === 'text')
          .map((c) => c.text ?? '')
          .join('')
      : undefined;
  else if (provider === 'ollama') t = j.message?.content;
  else t = j.choices?.[0]?.message?.content;
  if (typeof t !== 'string' || !t.trim()) throw new AiError('invalid_response', undefined, 'empty');
  return t;
}

export async function callLlm(m: LlmModule, apiKey: string | null, msg: LlmMessages): Promise<string> {
  const req = llmRequest(m, apiKey, msg);
  let res: Response;
  try {
    res = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      redirect: 'manual',
      signal: AbortSignal.timeout(m.timeoutSec * 1000),
    });
  } catch (err) {
    const name = (err as Error).name;
    throw new AiError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'unreachable');
  }
  if (res.status === 401 || res.status === 403) {
    await res.body?.cancel();
    throw new AiError('auth_failed', res.status);
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new AiError('http_error', res.status);
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new AiError('timeout');
    throw new AiError('invalid_response', res.status, 'body_not_json');
  }
  return llmText(m.provider, json);
}

// ---------- Ausgabeschema der KI (05_ki-empfehlungen.md, Abschnitt 3) ----------
const opt = (max: number) => z.string().trim().max(max).optional().nullable();
export const aiRecommendationSchema = z.object({
  horizon: z.enum(['short', 'long']),
  checkpointIds: z.array(z.string().min(1).max(40)).min(1).max(10),
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(2000),
  nextStep: opt(500),
  benefit: opt(500),
  metric: opt(300),
  ownerRole: opt(100),
});
export const aiResponseSchema = z.object({
  recommendations: z.array(aiRecommendationSchema).min(1).max(30),
});
export type AiRecommendation = z.infer<typeof aiRecommendationSchema>;

/** JSON aus dem Antworttext lesen (toleriert Code-Fences) und gegen Schema und bekannte KP-IDs prüfen. */
export function parseAiResponse(text: string, knownIds: Set<string>): AiRecommendation[] {
  let raw = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(raw);
  if (fence) raw = fence[1]!;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new AiError('invalid_response', undefined, 'invalid_json');
  }
  const parsed = aiResponseSchema.safeParse(data);
  if (!parsed.success) throw new AiError('invalid_response', undefined, 'schema');
  for (const r of parsed.data.recommendations)
    for (const id of r.checkpointIds)
      if (!knownIds.has(id)) throw new AiError('invalid_response', undefined, 'unknown_checkpoint');
  return parsed.data.recommendations;
}

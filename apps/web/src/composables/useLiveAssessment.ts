import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiPost, setLiveConnection } from '../api/client';

export interface PresenceEntry {
  userId: string;
  name: string;
  departmentName: string | null;
  keyAreaId: string | null;
  view: 'questionnaire' | 'consolidation' | 'overview';
}

export interface AnswerEvent {
  departmentId: string;
  checkpointId: string;
  value: string;
  version: number;
  updatedBy: string;
  origin?: string | null;
}

type Handlers = {
  answer?: (e: AnswerEvent) => void;
  comment?: (e: { checkpointId: string }) => void;
  consolidated?: (e: { checkpointId: string }) => void;
  submission?: (e: { departmentId: string }) => void;
  assessment?: (e: { deleted?: boolean }) => void;
};

/**
 * Live-Aktualisierung eines Assessments (TC-MU-001) und Präsenz (TC-MU-003) über Server-Sent Events.
 * Der Browser verbindet sich nach Unterbrechungen selbst neu; danach wird die eigene Präsenz erneut gemeldet.
 */
export function useLiveAssessment(
  id: string,
  opts: { view: PresenceEntry['view']; keyAreaId?: () => string | null; on: Handlers },
) {
  const presence = ref<PresenceEntry[]>([]);
  const connected = ref(false);
  let connectionId: string | null = null;
  let source: EventSource | null = null;

  /**
   * Präsenz melden – nacheinander und immer mit dem aktuellen Kernbereich. Gleichzeitige Meldungen
   * (Verbindungsaufbau + Laden des Kernbereichs) könnten sonst in falscher Reihenfolge ankommen.
   */
  let chain: Promise<unknown> = Promise.resolve();
  let lastSent: string | null | undefined;
  function report() {
    chain = chain.then(async () => {
      if (!connectionId) return;
      const keyAreaId = opts.keyAreaId?.() ?? null;
      const key = `${connectionId}|${keyAreaId}`;
      if (key === lastSent) return;
      lastSent = key;
      await apiPost(`/api/assessments/${id}/presence`, { connectionId, keyAreaId, view: opts.view });
    });
  }

  /** Eigenes Echo erkennen: Ereignis stammt aus diesem Fenster. */
  const isOwn = (e: { origin?: string | null }) => !!e.origin && e.origin === connectionId;

  function connect() {
    if (typeof EventSource === 'undefined') return;
    const q = new URLSearchParams({ view: opts.view });
    const area = opts.keyAreaId?.();
    if (area) q.set('keyAreaId', area);
    source = new EventSource(`/api/assessments/${id}/events?${q.toString()}`);
    const parse = (e: Event) => JSON.parse((e as MessageEvent<string>).data) as never;
    source.addEventListener('hello', (e) => {
      connectionId = (parse(e) as { connectionId: string }).connectionId;
      setLiveConnection(connectionId);
      connected.value = true;
      // Aktuellen Kernbereich melden: Beim Verbindungsaufbau war er evtl. noch nicht geladen,
      // nach einer Neuverbindung enthält die Adresse noch den alten.
      report();
    });
    source.addEventListener(
      'presence',
      (e) => (presence.value = (parse(e) as { users: PresenceEntry[] }).users),
    );
    for (const type of ['answer', 'comment', 'consolidated', 'submission', 'assessment'] as const)
      source.addEventListener(type, (e) => {
        const data = parse(e) as { origin?: string | null };
        if (type === 'answer' && isOwn(data)) return;
        (opts.on[type] as ((d: unknown) => void) | undefined)?.(data);
      });
    source.onerror = () => (connected.value = false);
  }

  if (opts.keyAreaId) watch(opts.keyAreaId, () => report());
  onMounted(connect);
  onBeforeUnmount(() => {
    source?.close();
    setLiveConnection(null);
  });

  return { presence, connected };
}

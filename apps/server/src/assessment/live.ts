/**
 * Live-Aktualisierung (TC-MU-001) und Präsenz (TC-MU-003, US-2.5) je Assessment.
 *
 * Der Server hält je Assessment die offenen Ereignisströme (Server-Sent Events) im Speicher.
 * Änderungen werden an alle Ströme dieses Assessments verteilt; was ein Empfänger sehen darf,
 * entscheidet `visibleFor` (Befragte erhalten keine Antworten anderer Abteilungen).
 * Ausgelegt für einen Serverprozess; bei mehreren Instanzen bräuchte es einen gemeinsamen Kanal (z. B. PostgreSQL NOTIFY).
 */
import type { ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

export type LiveEvent =
  | {
      type: 'answer';
      departmentId: string;
      checkpointId: string;
      value: string;
      version: number;
      updatedBy: string;
      /** Verbindung, von der die Änderung kam (Header `X-Live-Connection`); dieses Fenster ignoriert das Echo. */
      origin?: string | null;
    }
  | { type: 'comment'; checkpointId: string }
  | { type: 'consolidated'; checkpointId: string }
  | { type: 'submission'; departmentId: string }
  | { type: 'assessment'; deleted?: boolean };

export interface PresenceEntry {
  userId: string;
  name: string;
  departmentName: string | null;
  keyAreaId: string | null;
  view: 'questionnaire' | 'consolidation' | 'overview';
}

interface Connection {
  id: string;
  assessmentId: string;
  role: string;
  departmentId: string | null;
  res: ServerResponse;
  presence: PresenceEntry;
  heartbeat: NodeJS.Timeout;
}

export const HEARTBEAT_MS = 20_000;

export class LiveHub {
  private byAssessment = new Map<string, Map<string, Connection>>();

  /** Öffnet einen Ereignisstrom; liefert die Verbindungs-ID (für Präsenzmeldungen). */
  open(
    res: ServerResponse,
    c: { assessmentId: string; role: string; departmentId: string | null; presence: PresenceEntry },
  ): string {
    const id = randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    const conn: Connection = {
      id,
      ...c,
      res,
      heartbeat: setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS),
    };
    let map = this.byAssessment.get(c.assessmentId);
    if (!map) this.byAssessment.set(c.assessmentId, (map = new Map()));
    map.set(id, conn);
    this.send(conn, 'hello', { connectionId: id });
    res.on('close', () => this.close(c.assessmentId, id));
    this.broadcastPresence(c.assessmentId);
    return id;
  }

  private close(assessmentId: string, id: string) {
    const map = this.byAssessment.get(assessmentId);
    const conn = map?.get(id);
    if (!map || !conn) return;
    clearInterval(conn.heartbeat);
    map.delete(id);
    if (map.size === 0) this.byAssessment.delete(assessmentId);
    this.broadcastPresence(assessmentId);
  }

  /** Präsenz einer eigenen Verbindung ändern; fremde Verbindungs-IDs werden ignoriert. */
  updatePresence(
    assessmentId: string,
    connectionId: string,
    userId: string,
    patch: Partial<PresenceEntry>,
  ): boolean {
    const conn = this.byAssessment.get(assessmentId)?.get(connectionId);
    if (!conn || conn.presence.userId !== userId) return false;
    conn.presence = { ...conn.presence, ...patch, userId };
    this.broadcastPresence(assessmentId);
    return true;
  }

  presence(assessmentId: string): PresenceEntry[] {
    const seen = new Map<string, PresenceEntry>();
    for (const c of this.byAssessment.get(assessmentId)?.values() ?? []) {
      // Je Person ein Eintrag; ein Fenster mit Kernbereich hat Vorrang vor der Übersicht.
      const prev = seen.get(c.presence.userId);
      if (!prev || (!prev.keyAreaId && c.presence.keyAreaId)) seen.set(c.presence.userId, c.presence);
    }
    return [...seen.values()];
  }

  publish(assessmentId: string, event: LiveEvent): void {
    for (const c of this.byAssessment.get(assessmentId)?.values() ?? [])
      if (visibleFor(c, event)) this.send(c, event.type, event);
  }

  connections(assessmentId: string): number {
    return this.byAssessment.get(assessmentId)?.size ?? 0;
  }

  /** Beim Herunterfahren alle Ströme beenden, damit der Server nicht auf offene Verbindungen wartet. */
  closeAll(): void {
    for (const map of this.byAssessment.values())
      for (const c of map.values()) {
        clearInterval(c.heartbeat);
        c.res.end();
      }
    this.byAssessment.clear();
  }

  private broadcastPresence(assessmentId: string) {
    const users = this.presence(assessmentId);
    for (const c of this.byAssessment.get(assessmentId)?.values() ?? []) this.send(c, 'presence', { users });
  }

  private send(c: Connection, type: string, data: unknown) {
    c.res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

/** Befragte sehen weder Antworten anderer Abteilungen noch die Zusammenführung (US-9.1, TC-CONS-006). */
function visibleFor(c: Pick<Connection, 'role' | 'departmentId'>, e: LiveEvent): boolean {
  if (c.role !== 'respondent') return true;
  if (e.type === 'answer') return e.departmentId === c.departmentId;
  if (e.type === 'consolidated') return false;
  return true;
}

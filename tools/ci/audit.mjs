#!/usr/bin/env node
/**
 * npm audit mit begründeten Ausnahmen (CI-Schritt „Sicherheitslücken in Abhängigkeiten“).
 *
 * Schlägt fehl bei jeder Meldung ab „moderate“, die nicht in tools/ci/audit-allowlist.json steht – und bei
 * Ausnahmen, deren Ablaufdatum überschritten ist. Eine Ausnahme ist nur für Meldungen gedacht, für die es noch
 * keine korrigierte Version gibt und die das Produkt nachweislich nicht betreffen; sie muss begründet sein und
 * läuft ab, damit sie erneut geprüft wird. Nicht mehr gemeldete Ausnahmen werden als „kann entfernt werden“ genannt.
 *
 *   node tools/ci/audit.mjs            (npm run audit)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];
const MIN = LEVELS.indexOf('moderate');
const allow = JSON.parse(readFileSync(new URL('./audit-allowlist.json', import.meta.url), 'utf8')).advisories;
const today = new Date().toISOString().slice(0, 10);

let raw;
try {
  raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  raw = e.stdout; // npm audit beendet sich bei Funden mit Code 1 – die JSON-Ausgabe ist trotzdem vollständig
}
const report = JSON.parse(raw);
if (report.error) {
  console.error(`npm audit fehlgeschlagen: ${report.error.summary ?? JSON.stringify(report.error)}`);
  process.exit(2);
}

// Eigentliche Meldungen (Einträge in „via“ mit url), über alle betroffenen Pakete zusammengefasst
const advisories = new Map();
for (const v of Object.values(report.vulnerabilities ?? {}))
  for (const via of v.via)
    if (typeof via === 'object' && via.url) {
      const id = via.url.split('/').pop();
      if (!advisories.has(id)) advisories.set(id, { id, title: via.title, severity: via.severity });
    }
const problems = [];
const accepted = [];
for (const a of advisories.values()) {
  if (LEVELS.indexOf(a.severity) < MIN) continue;
  const entry = allow.find((x) => x.id === a.id);
  if (!entry) problems.push(`${a.severity.toUpperCase()} ${a.id} ${a.title}`);
  else if (entry.until < today)
    problems.push(`Ausnahme abgelaufen (${entry.until}): ${a.id} ${a.title} – erneut prüfen`);
  else accepted.push(`${a.id} (${a.severity}, bis ${entry.until}): ${entry.reason}`);
}
for (const entry of allow)
  if (!advisories.has(entry.id))
    console.log(`Hinweis: Ausnahme ${entry.id} wird nicht mehr gemeldet und kann entfernt werden.`);

if (accepted.length)
  console.log(`Begründete Ausnahmen (tools/ci/audit-allowlist.json):\n  ${accepted.join('\n  ')}`);
if (problems.length) {
  console.error(`npm audit: ${problems.length} Meldung(en) ohne Ausnahme:\n  ${problems.join('\n  ')}`);
  console.error('Details: npm audit');
  process.exit(1);
}
console.log('npm audit: keine Meldung ab „moderate“ außer den begründeten Ausnahmen.');

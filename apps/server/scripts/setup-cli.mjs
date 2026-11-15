#!/usr/bin/env node
/**
 * Ersteinrichtung über die Kommandozeile (Phase 8c) – für den Container-Betrieb.
 *
 * Die Ersteinrichtung ist nur über localhost erlaubt (R-06). Im Container kommen Anfragen vom Host aber über das
 * Docker-Netz (nicht 127.0.0.1); die Einrichtungsseite im Browser bleibt deshalb unsichtbar. Dieses Skript läuft
 * im Container und spricht den Server über 127.0.0.1 an – wer es ausführen kann, hat Zugriff auf den Host.
 *
 *   docker compose -f docker-compose.prod.yml exec app ai-tpi-setup
 *
 * Fragt Firma, Kürzel, Branche, Name, E-Mail und Passwort ab (Passwort verdeckt). Für automatisierte
 * Installationen können alle Werte als Umgebungsvariablen übergeben werden:
 * SETUP_COMPANY_NAME, SETUP_COMPANY_SLUG, SETUP_INDUSTRY_CODE, SETUP_ADMIN_NAME, SETUP_ADMIN_EMAIL,
 * SETUP_ADMIN_PASSWORD.
 */
import { createInterface } from 'node:readline';

const port = process.env.SERVER_PORT || '3000';
const base = `http://127.0.0.1:${port}`;
const env = process.env;

// Eine gemeinsame Eingabe für alle Fragen (auch wenn die Antworten per Pipe kommen).
const tty = process.stdin.isTTY === true;
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
let muted = false;
const write = rl._writeToOutput?.bind(rl);
if (write)
  rl._writeToOutput = (s) => {
    // Passworteingabe nicht anzeigen
    if (!muted) write(s);
  };
const lines = [];
let waiting = null;
rl.on('line', (l) => (waiting ? (waiting(l), (waiting = null)) : lines.push(l)));
rl.on('close', () => waiting?.(''));

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    muted = hidden && tty;
    process.stdout.write(question);
    const done = (answer) => {
      if (muted) process.stdout.write('\n');
      muted = false;
      resolve(answer.trim());
    };
    if (lines.length) done(lines.shift());
    else waiting = done;
  });
}

async function value(name, question, opts) {
  return env[name] ?? (await ask(question, opts));
}

const status = await fetch(`${base}/api/setup/status`).catch(() => null);
if (!status) {
  console.error(`Server unter ${base} nicht erreichbar. Läuft der Container?`);
  process.exit(1);
}
if (status.status === 404) {
  console.error(
    'Ersteinrichtung nicht verfügbar: Es gibt bereits Nutzer, oder SETUP_ENABLED=false ist gesetzt.',
  );
  process.exit(1);
}
const { industries } = await status.json();

console.log('AI_TPI – Ersteinrichtung (erster Admin und erste Firma)\n');
const companyName = await value('SETUP_COMPANY_NAME', 'Firmenname: ');
const companySlug = await value('SETUP_COMPANY_SLUG', 'Firmenkürzel für die Anmeldeadresse (z. B. heise): ');
if (!env.SETUP_INDUSTRY_CODE) {
  console.log('\nBranchen:');
  for (const i of industries) console.log(`  ${i.code.padEnd(6)} ${i.nameDe}`);
}
const industryCode = await value('SETUP_INDUSTRY_CODE', 'Branchencode: ');
const name = await value('SETUP_ADMIN_NAME', 'Ihr Name: ');
const email = await value('SETUP_ADMIN_EMAIL', 'Ihre E-Mail-Adresse: ');
const password = await value('SETUP_ADMIN_PASSWORD', 'Passwort: ', { hidden: true });
const passwordRepeat = env.SETUP_ADMIN_PASSWORD ?? (await ask('Passwort wiederholen: ', { hidden: true }));

const res = await fetch(`${base}/api/setup`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-requested-with': 'ai-tpi' },
  body: JSON.stringify({ companyName, companySlug, industryCode, name, email, password, passwordRepeat }),
});
const body = await res.json().catch(() => ({}));
rl.close();
if (res.status === 201) {
  const url = (env.PUBLIC_BASE_URL || base).replace(/\/$/, '');
  console.log(`\nEingerichtet. Anmeldung: ${url}/login/${body.companySlug}`);
  process.exit(0);
}
const MESSAGES = {
  password_mismatch: 'Die Passwörter stimmen nicht überein.',
  password_policy:
    'Das Passwort ist zu schwach. Regeln: Mindestlänge, eine Zahl, ein Großbuchstabe, ein Sonderzeichen ' +
    'und mindestens „mittlere“ Stärke (keine Wörter, Namen oder Muster).',
  domain_blocked: 'E-Mail-Adressen dieser Domain sind nicht zugelassen (Freemail-Anbieter).',
  invalid_input: `Ungültige Eingabe: ${(body.fields ?? []).join(', ')}`,
  conflict: 'Das Firmenkürzel oder die E-Mail-Adresse ist bereits vergeben.',
  rate_limited: 'Zu viele Versuche – bitte eine Minute warten.',
  not_found: 'Ersteinrichtung nicht (mehr) verfügbar.',
};
console.error(`\nFehler: ${MESSAGES[body.error] ?? body.error ?? `HTTP ${res.status}`}`);
const RULES = {
  minLength: 'Mindestlänge',
  digit: 'Zahl',
  uppercase: 'Großbuchstabe',
  special: 'Sonderzeichen',
};
if (body.error === 'password_policy') {
  const missing = (body.rules ?? []).filter((r) => !r.met).map((r) => RULES[r.id] ?? r.id);
  if (missing.length) console.error(`  Nicht erfüllt: ${missing.join(', ')}`);
  else
    console.error(
      `  Alle Regeln erfüllt, aber Stärke „${body.strength}“ – bitte ein längeres Passwort wählen.`,
    );
}
process.exit(1);

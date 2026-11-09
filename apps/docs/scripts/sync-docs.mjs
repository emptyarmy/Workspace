/**
 * Übernimmt die Projektdokumentation aus <repo>/docs in die Astro-Inhalte (src/content/docs/projekt).
 *
 * - Eine Quelle: Die Markdown-Dateien unter docs/ bleiben maßgeblich; diese Kopie wird bei jedem
 *   `npm run dev`/`npm run build` der Doku-Seite neu erzeugt und ist per .gitignore ausgeschlossen.
 * - Ordner und Dateien verlieren das Nummernpräfix („04_architektur/07_admin-bereich.md“ →
 *   „architektur/admin-bereich“); die Nummer bestimmt die Reihenfolge in der Seitenleiste.
 * - Titel = erste Überschrift „# …“, Beschreibung = erster Absatz. Starlight braucht beides im Frontmatter.
 * - Verweise wie `07_admin-bereich.md` oder `docs/04_architektur/07_admin-bereich.md` werden zu Links.
 * - Originaldokumente in docs/_quellen werden nicht übernommen.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../../../docs');
const TARGET = resolve(here, '../src/content/docs/projekt');

const stripPrefix = (name) => name.replace(/^\d+_/, '');
const orderOf = (name) => {
  const n = name.match(/^(\d+)_/) ?? name.match(/^ADR-(\d+)/i);
  return n ? Number(n[1]) : 0;
};
const slugOf = (file) => {
  const base = basename(file, '.md');
  return base.toUpperCase() === 'README' ? 'index' : stripPrefix(base).toLowerCase();
};

/** Alle Markdown-Dateien unter docs/ (ohne _quellen). */
function collect(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry.startsWith('_') || entry.startsWith('.')) return [];
    if (statSync(full).isDirectory()) return collect(full);
    return entry.endsWith('.md') ? [full] : [];
  });
}

const files = collect(SOURCE).sort();
/** Quelle → Seitenpfad, z. B. docs/04_architektur/07_admin-bereich.md → /projekt/architektur/admin-bereich/ */
const routes = new Map(
  files.map((f) => {
    const rel = relative(SOURCE, f);
    const dir = dirname(rel)
      .split('/')
      .filter((p) => p !== '.')
      .map(stripPrefix)
      .join('/');
    const slug = slugOf(f);
    const route = `/projekt/${dir ? `${dir}/` : ''}${slug === 'index' ? '' : `${slug}/`}`;
    return [rel, { route, out: join(TARGET, dir, `${slug}.md`) }];
  }),
);
/** Dateiname → Route, nur wenn eindeutig (für Verweise ohne Ordner). */
const byName = new Map();
for (const [rel, { route }] of routes) {
  const name = basename(rel);
  byName.set(name, byName.has(name) ? null : route);
}

function resolveRef(ref) {
  const clean = ref.replace(/^\.?\/?(docs\/)?/, '');
  if (routes.has(clean)) return routes.get(clean).route;
  return byName.get(basename(clean)) ?? null;
}

/** Ersetzt `…/xy.md`-Verweise außerhalb von Codeblöcken durch Links auf die erzeugte Seite. */
function linkify(body) {
  let fence = false;
  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fence = !fence;
      if (fence) return line;
      return line.replace(/(?<!\[)`((?:docs\/)?(?:[\w-]+\/)*[\w.-]+\.md)`(?!\])/g, (m, ref) => {
        const route = resolveRef(ref);
        return route ? `[\`${basename(ref)}\`](${route})` : m;
      });
    })
    .join('\n');
}

function plain(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

rmSync(TARGET, { recursive: true, force: true });
let count = 0;
for (const [rel, { out }] of routes) {
  const src = readFileSync(join(SOURCE, rel), 'utf8').replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  const h1 = lines.findIndex((l) => /^#\s+/.test(l));
  const title = h1 >= 0 ? lines[h1].replace(/^#\s+/, '').trim() : slugOf(rel);
  const body = h1 >= 0 ? lines.slice(h1 + 1).join('\n') : src;
  const firstPara = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|\||```|- |\* |\d+\.|<|:::|---)/.test(p));
  const description = firstPara ? plain(firstPara).slice(0, 200) : undefined;
  const front = [
    '---',
    `title: ${JSON.stringify(title)}`,
    ...(description ? [`description: ${JSON.stringify(description)}`] : []),
    'editUrl: false',
    'sidebar:',
    `  order: ${orderOf(basename(rel))}`,
    '---',
    '',
    `:::note[Projektdokumentation]`,
    `Diese Seite wird automatisch aus \`docs/${rel}\` erzeugt. Änderungen bitte dort vornehmen.`,
    ':::',
    '',
  ].join('\n');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, front + linkify(body).replace(/^\n+/, ''));
  count++;
}
console.log(`sync-docs: ${count} Dateien aus docs/ übernommen → ${relative(process.cwd(), TARGET)}`);
if (!existsSync(TARGET)) process.exit(1);

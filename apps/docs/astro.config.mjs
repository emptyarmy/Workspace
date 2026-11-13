// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';

/**
 * Dokumentationsseite für AI_TPI (Astro + Starlight).
 * - Handgeschriebene Seiten: src/content/docs/{handbuch,entwicklung,referenz}
 * - Projektdokumentation: wird per `npm run sync` aus dem Ordner docs/ des Repos erzeugt (src/content/docs/projekt, nicht einchecken)
 * Start: npm run docs:dev (Port 4321) · Bauen: npm run docs:build (Ausgabe apps/docs/dist)
 */
export default defineConfig({
  server: { host: '127.0.0.1', port: Number(process.env.DOCS_PORT ?? 4321) },
  // Astro 7: Remark-Plugins direkt am Markdown-Prozessor angeben (markdown.remarkPlugins ist veraltet).
  markdown: { processor: unified({ remarkPlugins: [remarkMermaid] }) },
  // Mermaid wird nur auf Seiten mit Diagrammen nachgeladen; die Paketgröße ist daher unkritisch.
  vite: { build: { chunkSizeWarningLimit: 4000 } },
  integrations: [
    starlight({
      title: 'AI_TPI Dokumentation',
      description: 'Kontinuierliche Testprozessverbesserung mit TPI NEXT, Agile TPI und KI – Handbuch, Entwicklung und Projektdokumentation.',
      defaultLocale: 'root',
      locales: { root: { label: 'Deutsch', lang: 'de' } },
      lastUpdated: false,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      customCss: ['./src/styles/custom.css'],
      components: { Head: './src/components/Head.astro' },
      sidebar: [
        { label: 'Einstieg', items: [{ label: 'Startseite', link: '/' }, { slug: 'einstieg/ueberblick' }, { slug: 'einstieg/schnellstart' }] },
        { label: 'Handbuch', items: [{ autogenerate: { directory: 'handbuch' } }] },
        { label: 'Entwicklung', items: [{ autogenerate: { directory: 'entwicklung' } }] },
        { label: 'Referenz', items: [{ autogenerate: { directory: 'referenz' } }] },
        {
          label: 'Projektdokumentation',
          collapsed: true,
          items: [
            { label: 'Überblick', items: [{ autogenerate: { directory: 'projekt/ueberblick' } }] },
            { label: 'Anforderungen', items: [{ autogenerate: { directory: 'projekt/anforderungen' } }] },
            { label: 'Analyse', items: [{ autogenerate: { directory: 'projekt/analyse' } }] },
            { label: 'Fragenkatalog', items: [{ autogenerate: { directory: 'projekt/fragenkatalog' } }] },
            { label: 'Architektur', items: [{ autogenerate: { directory: 'projekt/architektur' } }] },
            { label: 'Test', items: [{ autogenerate: { directory: 'projekt/test' } }] },
            { label: 'Umsetzung', items: [{ autogenerate: { directory: 'projekt/umsetzung' } }] },
            { label: 'Entscheidungen (ADR)', items: [{ autogenerate: { directory: 'projekt/entscheidungen' } }] },
          ],
        },
      ],
    }),
  ],
});

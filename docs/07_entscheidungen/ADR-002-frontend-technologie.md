# ADR-002: Frontend-Technologie

- **Status:** akzeptiert (09.11.2026)
- **Bezug:** F-23, N-10 (TypeScript und Vue freigegeben)

## Optionen
1. React + Vite
2. **Vue 3 + Vite + TypeScript**
3. Vanilla JS mit Web Components

## Entscheidung
**Vue 3 (Composition API, `<script setup lang="ts">`) mit Vite und TypeScript**, dazu PrimeVue, Pinia, Vue Router, vue-i18n, VeeValidate + Zod und vue-echarts. Auch Backend und Shared-Pakete werden in TypeScript geschrieben.

Begründung: ausdrücklich freigegeben, gut lesbare Single-File-Components, und Typsicherheit für die komplexe Rollen-, Mandanten- und Konsolidierungslogik.

## Konsequenzen
- `vue-tsc` läuft als Typprüfung in der Pipeline.
- Playwright-Selektoren über `data-testid` und ARIA-Rollen; PrimeVue-Komponenten erhalten dafür `pt`-Attribute (Pass-Through).

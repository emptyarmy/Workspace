// Schema-Prüfung des Fragenkatalogs mit ajv (JSON Schema 2020-12) – wird von validate.py aufgerufen,
// wenn das Python-Paket „jsonschema“ fehlt oder zu alt ist. Ausgabe: JSON-Liste der Fehlermeldungen.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const catalogDir = fileURLToPath(new URL('../../packages/catalog/', import.meta.url));
const require = createRequire(catalogDir + 'package.json');
const Ajv2020 = require('ajv/dist/2020.js').default;
const addFormats = require('ajv-formats').default ?? require('ajv-formats');

const schema = JSON.parse(readFileSync(catalogDir + 'catalog.schema.json', 'utf8'));
const catalog = JSON.parse(readFileSync(catalogDir + 'catalog.v1.json', 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const ok = validate(catalog);
process.stdout.write(
  JSON.stringify(ok ? [] : validate.errors.map((e) => `Schema: ${e.instancePath || '/'}: ${e.message}`)),
);

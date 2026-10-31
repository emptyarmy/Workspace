import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { DrawingSpec, OutputFormat } from "./drawing.js";
import { RESULT_MARK } from "./qcad.js";

const BUILDER = fileURLToPath(new URL("../qcad/build_drawing.js", import.meta.url));

/** JSON is valid ECMAScript except for raw U+2028/U+2029 in older engines. */
export function jsLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export async function drawingScript(spec: DrawingSpec): Promise<string> {
  return `var SPEC = ${jsLiteral(spec)};\n${await readFile(BUILDER, "utf8")}`;
}

const FORMATS: Record<OutputFormat, string> = { dxf: "DXF 2013", dwg: "DWG 2013" };

/**
 * Wraps user-supplied ECMAScript so it runs against a fresh (or imported)
 * document. The user code sees `doc`, `di` and `log`, and its return value is
 * reported back.
 */
export function customScript(
  code: string,
  options: { inputFile?: string; outputFile?: string; format?: OutputFormat },
): string {
  const cfg = {
    inputFile: options.inputFile ?? null,
    outputFile: options.outputFile ?? null,
    format: options.format ? FORMATS[options.format] : null,
  };
  return `include("scripts/library.js");
include("scripts/simple.js");
var __cfg = ${jsLiteral(cfg)};
var __logs = [];
function __report(o) { o.log = __logs; print(${jsLiteral(RESULT_MARK)} + JSON.stringify(o)); }
try {
    var doc = createOffScreenDocument();
    var di = new RDocumentInterface(doc);
    if (__cfg.inputFile) {
        var __err = di.importFile(__cfg.inputFile);
        if (__err !== RDocumentInterface.IoErrorNoError) {
            throw new Error("Could not open '" + __cfg.inputFile + "' (error code " + __err + ")");
        }
    }
    var __ret = (function(doc, di, log) {
${code}
    })(doc, di, function() { __logs.push(Array.prototype.slice.call(arguments).join(" ")); });
    if (__cfg.outputFile && !di.exportFile(__cfg.outputFile, __cfg.format)) {
        throw new Error("Export failed: " + __cfg.outputFile);
    }
    var __value = null;
    try { __value = JSON.parse(JSON.stringify(__ret === undefined ? null : __ret)); } catch (e) { __value = String(__ret); }
    __report({ ok: true, result: __value, entityCount: doc.queryAllEntities().length, output: __cfg.outputFile });
} catch (ex) {
    __report({ ok: false, error: String(ex.message || ex) + (ex.lineNumber ? " (line " + ex.lineNumber + ")" : "") });
}
`;
}

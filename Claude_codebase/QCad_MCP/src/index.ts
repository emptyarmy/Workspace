#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Drawing, type OutputFormat } from "./drawing.js";
import { openInGui, renderPng, runScript } from "./qcad.js";
import { entitySchema, layerSchema, units } from "./schema.js";
import { customScript, drawingScript } from "./script.js";

const OUTPUT_DIR = process.env.QCAD_MCP_OUTPUT_DIR ?? fileURLToPath(new URL("../drawings", import.meta.url));

interface BuildResult {
  ok: boolean;
  error?: string;
  entityCount?: number;
  boundingBox?: [number, number, number, number] | null;
  outputs?: string[];
}

const drawing = new Drawing();

function resolvePath(path: string): string {
  return isAbsolute(path) ? path : resolve(OUTPUT_DIR, path);
}

function formatOf(path: string): OutputFormat {
  const ext = extname(path).toLowerCase();
  if (ext === ".dxf" || ext === ".dwg") return ext.slice(1) as OutputFormat;
  throw new Error(`Unsupported file extension "${ext}". Use .dxf or .dwg.`);
}

function text(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

function failure(err: unknown): CallToolResult {
  return { isError: true, content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }] };
}

/** Wraps a tool handler so thrown errors become MCP tool errors the model can react to. */
function handle<A>(fn: (args: A) => Promise<CallToolResult> | CallToolResult) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return await fn(args);
    } catch (err) {
      return failure(err);
    }
  };
}

async function build(outputs: { path: string; format: OutputFormat }[]): Promise<BuildResult> {
  for (const o of outputs) await mkdir(dirname(o.path), { recursive: true });
  const result = await runScript<BuildResult>(await drawingScript(drawing.toSpec(outputs)));
  if (!result.ok) throw new Error(`QCAD error: ${result.error}`);
  return result;
}

async function save(path?: string): Promise<BuildResult & { path: string }> {
  const target = resolvePath(path ?? drawing.lastSavedPath ?? `${drawing.name}.dxf`);
  const result = await build([{ path: target, format: formatOf(target) }]);
  drawing.lastSavedPath = target;
  return { ...result, path: target };
}

const server = new McpServer(
  { name: "qcad-mcp", version: "0.1.0" },
  {
    instructions: [
      "Creates 2D CAD drawings with QCAD and saves them as DXF/DWG.",
      "Workflow: new_drawing -> add_layer (optional) -> add_entities (batch many entities per call) -> preview_drawing to check the result visually -> save_drawing and/or open_in_qcad.",
      "Coordinates are in drawing units (default mm), Y points up, angles are degrees counter-clockwise from +X.",
      "Entities get ids (e1, e2, ...) that remove_entities accepts; get_drawing shows the current state.",
      "For anything the entity types cannot express (blocks, transformations, reading existing files), use run_qcad_script.",
    ].join("\n"),
  },
);

server.registerTool(
  "new_drawing",
  {
    title: "New drawing",
    description: "Discards the current drawing and starts a new one. Optionally builds on top of an existing DXF/DWG file.",
    inputSchema: {
      name: z.string().optional().describe('Used as the default file name (default "zeichnung")'),
      unit: z.enum(units).optional().describe("Drawing unit, default mm"),
      dim_precision: z
        .number()
        .int()
        .min(0)
        .max(8)
        .optional()
        .describe("Decimal places of dimension values, default 2 (trailing zeros are suppressed)"),
      base_file: z.string().optional().describe("Existing DXF/DWG whose content is kept; new entities are added on top"),
    },
  },
  handle(({ name, unit, dim_precision, base_file }) => {
    drawing.reset({ name, unit, dimPrecision: dim_precision, baseFile: base_file ? resolvePath(base_file) : undefined });
    return text(`New drawing "${drawing.name}" (unit ${drawing.unit}${drawing.baseFile ? `, based on ${drawing.baseFile}` : ""}).`);
  }),
);

server.registerTool(
  "add_layer",
  {
    title: "Add layer",
    description: "Creates a layer, or updates it if one with the same name exists. Entities inherit its color, linetype and lineweight.",
    inputSchema: layerSchema,
  },
  handle((layer) => text(`Layer "${layer.name}" ${drawing.setLayer(layer) ? "updated" : "created"}.`)),
);

server.registerTool(
  "add_entities",
  {
    title: "Add entities",
    description:
      "Adds geometry, text, dimensions and hatches to the drawing. Pass all entities of a step in one call. " +
      "Returns the ids of the new entities.",
    inputSchema: { entities: z.array(entitySchema).min(1) },
  },
  handle(({ entities }) => {
    const ids = drawing.addEntities(entities);
    return text({ added: ids, totalEntities: drawing.entityCount });
  }),
);

server.registerTool(
  "remove_entities",
  {
    title: "Remove entities",
    description: "Removes entities by id (see get_drawing).",
    inputSchema: { ids: z.array(z.string()).min(1) },
  },
  handle(({ ids }) => text(drawing.removeEntities(ids))),
);

server.registerTool(
  "get_drawing",
  {
    title: "Get drawing",
    description: "Returns the current drawing: unit, layers and all entities with their ids.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  handle(() => text(drawing.toJSON())),
);

server.registerTool(
  "save_drawing",
  {
    title: "Save drawing",
    description:
      "Builds the drawing in QCAD and writes it to a .dxf or .dwg file. Relative paths are resolved against the output directory " +
      `(${OUTPUT_DIR}). Without a path, the last saved path or "<name>.dxf" is used.`,
    inputSchema: { path: z.string().optional() },
  },
  handle(async ({ path }) => text(await save(path))),
);

server.registerTool(
  "preview_drawing",
  {
    title: "Preview drawing",
    description: "Renders the current drawing to a PNG image so the result can be checked visually. Does not save anything.",
    inputSchema: {
      width: z.number().int().min(100).max(4000).optional().describe("Pixels, default 1200"),
      height: z.number().int().min(100).max(4000).optional().describe("Pixels, default 900"),
      background: z.string().optional().describe('Default "white"'),
    },
    annotations: { readOnlyHint: true },
  },
  handle(async ({ width, height, background }) => {
    const tmp = await mkdtemp(join(tmpdir(), "qcad-mcp-preview-"));
    try {
      const dxf = join(tmp, "preview.dxf");
      const png = join(tmp, "preview.png");
      const result = await build([{ path: dxf, format: "dxf" }]);
      await renderPng(dxf, png, { width: width ?? 1200, height: height ?? 900, background: background ?? "white" });
      return {
        content: [
          { type: "image", data: (await readFile(png)).toString("base64"), mimeType: "image/png" },
          { type: "text", text: JSON.stringify({ entityCount: result.entityCount, boundingBox: result.boundingBox }) },
        ],
      };
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }),
);

server.registerTool(
  "open_in_qcad",
  {
    title: "Open in QCAD",
    description:
      "Opens a drawing in the QCAD application. Without a path, the current drawing is saved first (like save_drawing without a path) and then opened.",
    inputSchema: { path: z.string().optional().describe("Existing file to open instead of the current drawing") },
  },
  handle(async ({ path }) => {
    const file = path ? resolvePath(path) : (await save()).path;
    openInGui(file);
    return text(`Opened ${file} in QCAD.`);
  }),
);

server.registerTool(
  "run_qcad_script",
  {
    title: "Run QCAD script",
    description:
      "Runs QCAD ECMAScript headless, for tasks the entity types do not cover (blocks, transformations, querying existing drawings). " +
      "The code runs as a function body with `doc` (RDocument), `di` (RDocumentInterface) and `log(...)` in scope; " +
      "its return value is reported back. Use the QCAD core API (e.g. RAddObjectsOperation + di.applyOperation) or the Simple API " +
      "between startTransaction(doc) and endTransaction(). Does not touch the current drawing.",
    inputSchema: {
      code: z.string(),
      input_file: z.string().optional().describe("DXF/DWG to load into doc before the code runs"),
      output_file: z.string().optional().describe(".dxf/.dwg to write doc to afterwards"),
    },
  },
  handle(async ({ code, input_file, output_file }) => {
    const out = output_file ? resolvePath(output_file) : undefined;
    if (out) await mkdir(dirname(out), { recursive: true });
    const result = await runScript<{ ok: boolean; error?: string }>(
      customScript(code, {
        inputFile: input_file ? resolvePath(input_file) : undefined,
        outputFile: out,
        format: out ? formatOf(out) : undefined,
      }),
    );
    return result.ok ? text(result) : failure(JSON.stringify(result, null, 2));
  }),
);

await server.connect(new StdioServerTransport());

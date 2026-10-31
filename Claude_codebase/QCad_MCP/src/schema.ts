import { z } from "zod";

// Points are plain [x, y] arrays rather than z.tuple(): tuple schemas become
// JSON-Schema `prefixItems`, which several MCP clients handle poorly.
const point = z.array(z.number()).length(2).describe("[x, y]");
const vertex = z
  .array(z.number())
  .min(2)
  .max(3)
  .describe("[x, y] or [x, y, bulge]; bulge = tan(arc angle / 4) of the segment starting at this vertex, 0 = straight");
const angle = (what: string) => z.number().describe(`${what} in degrees, counter-clockwise from +X`);

const style = {
  layer: z.string().optional().describe('Layer name (default "0"); must be created with add_layer first'),
  color: z.string().optional().describe('Overrides the layer color: name ("red") or "#rrggbb"'),
  linetype: z.string().optional().describe("Overrides the layer linetype, e.g. CONTINUOUS, CENTER, DASHED, HIDDEN"),
  lineweight: z.number().min(0).optional().describe("Overrides the layer lineweight in mm, e.g. 0.25, 0.5"),
};

const dimText = z
  .string()
  .optional()
  .describe('Text override; "<>" stands for the measured value, e.g. "Ø<> H7"');

export const entitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("line"), start: point, end: point, ...style }),
  z.object({ type: z.literal("circle"), center: point, radius: z.number().positive(), ...style }),
  z.object({
    type: z.literal("arc"),
    center: point,
    radius: z.number().positive(),
    startAngle: angle("Start angle"),
    endAngle: angle("End angle (arc runs counter-clockwise from start to end)"),
    ...style,
  }),
  z.object({
    type: z.literal("polyline"),
    points: z.array(vertex).min(2),
    closed: z.boolean().optional(),
    ...style,
  }),
  z.object({
    type: z.literal("rectangle"),
    corner: point.describe("Lower-left corner [x, y]"),
    width: z.number(),
    height: z.number(),
    ...style,
  }),
  z.object({
    type: z.literal("ellipse"),
    center: point,
    majorAxis: point.describe("Vector [dx, dy] from center to the end of the major axis"),
    ratio: z.number().positive().max(1).describe("Minor / major axis ratio"),
    startAngle: angle("Start parameter").optional(),
    endAngle: angle("End parameter").optional(),
    ...style,
  }),
  z.object({ type: z.literal("point"), position: point, ...style }),
  z.object({
    type: z.literal("text"),
    text: z.string(),
    position: point.describe("Insertion point, interpreted according to hAlign/vAlign"),
    height: z.number().positive(),
    angle: angle("Rotation").optional(),
    hAlign: z.enum(["left", "center", "right"]).optional(),
    vAlign: z.enum(["base", "bottom", "middle", "top"]).optional(),
    font: z.string().optional().describe('CAD font name, default "Standard"'),
    ...style,
  }),
  z.object({
    type: z.literal("dim_linear"),
    p1: point.describe("First measured point"),
    p2: point.describe("Second measured point"),
    dimLine: point.describe("Any point the dimension line passes through"),
    direction: z
      .union([z.enum(["horizontal", "vertical"]), z.number()])
      .optional()
      .describe('"horizontal" (default), "vertical", or a measuring angle in degrees'),
    text: dimText,
    ...style,
  }),
  z.object({
    type: z.literal("dim_aligned"),
    p1: point,
    p2: point,
    dimLine: point.describe("Any point the dimension line passes through (parallel to p1-p2)"),
    text: dimText,
    ...style,
  }),
  z.object({
    type: z.literal("dim_radius"),
    center: point,
    radius: z.number().positive(),
    angle: angle("Direction of the dimension arrow (default 45)").optional(),
    text: dimText,
    ...style,
  }),
  z.object({
    type: z.literal("dim_diameter"),
    center: point,
    radius: z.number().positive().describe("Radius of the circle (the dimension shows the diameter)"),
    angle: angle("Direction of the dimension line (default 45)").optional(),
    text: dimText,
    ...style,
  }),
  z.object({
    type: z.literal("dim_angular"),
    vertex: point.describe("Vertex where both legs meet"),
    p1: point.describe("Point on the first leg"),
    p2: point.describe("Point on the second leg"),
    arcPoint: point.describe("Point the dimension arc passes through (selects which angle is measured)"),
    text: dimText,
    ...style,
  }),
  z.object({
    type: z.literal("hatch"),
    loops: z
      .array(
        z.union([
          z.object({ points: z.array(vertex).min(3).describe("Closed boundary polygon") }),
          z.object({ circle: z.object({ center: point, radius: z.number().positive() }) }),
        ]),
      )
      .min(1)
      .describe("Boundary loops; the first is the outer boundary, further loops are holes"),
    solid: z.boolean().optional().describe("Solid fill instead of a pattern"),
    pattern: z.string().optional().describe('Hatch pattern, default "ANSI31" (others: ANSI32..ANSI38, ANSI37, AR-CONC, EARTH, DOTS, ...)'),
    scale: z.number().positive().optional(),
    angle: angle("Pattern rotation").optional(),
    ...style,
  }),
]);

export type Entity = z.infer<typeof entitySchema>;
export type StoredEntity = Entity & { id: string };

export const layerSchema = {
  name: z.string().min(1),
  color: z.string().optional().describe('Name ("red") or "#rrggbb"; default white (shown black on white background)'),
  linetype: z.string().optional().describe("Default CONTINUOUS. Others: CENTER, DASHED, HIDDEN, DASHDOT, PHANTOM, DOT, BORDER, ..."),
  lineweight: z.number().min(0).optional().describe("In mm, default 0.25"),
};

export type Layer = { name: string; color?: string; linetype?: string; lineweight?: number };

export const units = ["none", "mm", "cm", "m", "inch"] as const;
export type Unit = (typeof units)[number];

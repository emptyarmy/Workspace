import type { Entity, Layer, StoredEntity, Unit } from "./schema.js";

export type OutputFormat = "dxf" | "dwg";

// Must match what qcad/build_drawing.js reads from SPEC.
export interface DrawingSpec {
  unit: Unit;
  dimPrecision?: number;
  baseFile?: string;
  layers: Layer[];
  entities: StoredEntity[];
  outputs: { path: string; format: OutputFormat }[];
}

/**
 * The drawing being edited in this server session. Kept as plain data and only
 * turned into a real QCAD document when saved or previewed.
 */
export class Drawing {
  name = "zeichnung";
  unit: Unit = "mm";
  /** Decimal places of dimension values; left untouched for base files unless set. */
  dimPrecision?: number = 2;
  baseFile?: string;
  lastSavedPath?: string;
  private layers = new Map<string, Layer>();
  private entities: StoredEntity[] = [];
  private nextId = 1;

  reset(options: { name?: string; unit?: Unit; dimPrecision?: number; baseFile?: string } = {}): void {
    this.name = options.name ?? "zeichnung";
    this.unit = options.unit ?? "mm";
    this.dimPrecision = options.dimPrecision ?? (options.baseFile ? undefined : 2);
    this.baseFile = options.baseFile;
    this.lastSavedPath = undefined;
    this.layers.clear();
    this.entities = [];
    this.nextId = 1;
  }

  /** Adds or replaces a layer definition. Returns true if it replaced one. */
  setLayer(layer: Layer): boolean {
    const existed = this.layers.has(layer.name);
    this.layers.set(layer.name, layer);
    return existed;
  }

  /**
   * Validates layer references up front so mistakes surface on the add call
   * instead of on the next save. Layers of a base file are unknown here, so the
   * check is skipped when one is set.
   */
  addEntities(entities: Entity[]): string[] {
    if (!this.baseFile) {
      for (const [i, e] of entities.entries()) {
        if (e.layer && e.layer !== "0" && !this.layers.has(e.layer)) {
          throw new Error(
            `Entity ${i} (${e.type}) uses unknown layer "${e.layer}". Known layers: 0, ${[...this.layers.keys()].join(", ") || "-"}`,
          );
        }
      }
    }
    return entities.map((e) => {
      const id = `e${this.nextId++}`;
      this.entities.push({ ...e, id });
      return id;
    });
  }

  removeEntities(ids: string[]): { removed: string[]; notFound: string[] } {
    const wanted = new Set(ids);
    const removed: string[] = [];
    this.entities = this.entities.filter((e) => {
      if (!wanted.has(e.id)) return true;
      removed.push(e.id);
      return false;
    });
    return { removed, notFound: ids.filter((id) => !removed.includes(id)) };
  }

  get entityCount(): number {
    return this.entities.length;
  }

  toSpec(outputs: DrawingSpec["outputs"]): DrawingSpec {
    return {
      unit: this.unit,
      dimPrecision: this.dimPrecision,
      baseFile: this.baseFile,
      layers: [...this.layers.values()],
      entities: this.entities,
      outputs,
    };
  }

  toJSON() {
    return {
      name: this.name,
      unit: this.unit,
      dimPrecision: this.dimPrecision ?? null,
      baseFile: this.baseFile ?? null,
      lastSavedPath: this.lastSavedPath ?? null,
      layers: [...this.layers.values()],
      entities: this.entities,
    };
  }
}

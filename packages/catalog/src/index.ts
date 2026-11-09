/**
 * Typen und Zugriff auf den Fragenkatalog. Maßgebliche Quelle ist catalog.v1.json (siehe README).
 */
import catalogJson from '../catalog.v1.json' with { type: 'json' };

export type Lang = 'de' | 'en';
export type I18nText = Record<Lang, string>;
export type LevelId = 'initial' | 'controlled' | 'efficient' | 'optimizing';
export type CheckpointLevel = Exclude<LevelId, 'initial'>;
export type Effort = 'S' | 'M' | 'L';
export type AnswerValue = 'yes' | 'partial' | 'no' | 'na' | 'open';

export interface Checkpoint {
  id: string;
  keyArea: string;
  level: CheckpointLevel;
  effort: Effort;
  text: I18nText;
  recommendation: I18nText;
  source: 'TPI_NEXT_DE' | 'TPI_NEXT_RECON' | 'AGILE_TPI_EN' | 'AI_EXT';
  tags: Array<'agile' | 'AI' | 'reconstructed'>;
  agileRefs?: string[];
  view?: 'P' | 'T' | 'O';
  cluster?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  hint?: I18nText;
  dependsOn?: string[];
}

export interface KeyArea {
  id: string;
  order: number;
  name: I18nText;
  description: I18nText;
  levels: Record<CheckpointLevel, I18nText>;
  isAiArea: boolean;
  checkpoints: Checkpoint[];
}

export interface Catalog {
  catalogVersion: string;
  status: 'draft' | 'review' | 'released';
  languages: Lang[];
  levels: Array<{ id: LevelId; order: number; name: I18nText }>;
  answerValues: Array<{ id: AnswerValue; name: I18nText; score: number | null }>;
  efforts: Array<{ id: Effort; horizon: 'short' | 'long'; name: I18nText }>;
  views: Array<{ id: 'P' | 'T' | 'O'; name: I18nText }>;
  keyAreas: KeyArea[];
}

export const catalog = catalogJson as unknown as Catalog;

export function allCheckpoints(c: Catalog = catalog): Checkpoint[] {
  return c.keyAreas.flatMap((a) => a.checkpoints);
}

export function findCheckpoint(id: string, c: Catalog = catalog): Checkpoint | undefined {
  return allCheckpoints(c).find((cp) => cp.id === id);
}

import type { Category } from '../classification/classification.types';

export interface CategoryEntry {
  company: string;
  role: string | null;
}

export interface RunSummary {
  at: Date;
  durationMs: number;
  scanned: number;
  ignored: number;
  errors: number;
  byCategory: Record<Category, CategoryEntry[]>;
}

export function emptyByCategory(): Record<Category, CategoryEntry[]> {
  return {
    CONFIRMATION_CANDIDATURE: [],
    REFUS: [],
    ENTRETIEN: [],
    DEMANDE_INFO: [],
    AUTRE: [],
  };
}

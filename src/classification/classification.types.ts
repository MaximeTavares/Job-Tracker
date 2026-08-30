import type { ApplicationStatus } from '@prisma/client';

export const CATEGORIES = [
  'CONFIRMATION_CANDIDATURE',
  'REFUS',
  'ENTRETIEN',
  'DEMANDE_INFO',
  'AUTRE',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Confidence = 'high' | 'medium' | 'low';

export interface ClassificationResult {
  category: Category;
  company: string;
  role: string | null;
  platform: string | null;
  confidence: Confidence;
}

/** Email transmis au classifieur (produit par GmailService.getEmail). */
export interface EmailContent {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: Date;
  body: string;
}

export const CATEGORY_TO_STATUS: Record<Category, ApplicationStatus> = {
  CONFIRMATION_CANDIDATURE: 'CONFIRMED',
  REFUS: 'REJECTED',
  ENTRETIEN: 'INTERVIEW',
  DEMANDE_INFO: 'INFO_REQUESTED',
  AUTRE: 'OTHER',
};

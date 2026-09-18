/**
 * Copie manuelle du modèle Prisma (`prisma/schema.prisma` côté serveur) — à
 * maintenir en phase avec lui si le schéma évolue.
 */

export type ApplicationStatus =
  'CONFIRMED' | 'REJECTED' | 'INTERVIEW' | 'INFO_REQUESTED' | 'OTHER';

export interface Application {
  id: number;
  company: string;
  role: string | null;
  platform: string | null;
  appliedAt: string | null;
  status: ApplicationStatus;
  gmailThreadId: string;
  lastEventAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
}

export interface UpdateApplicationPayload {
  company?: string;
  role?: string;
  status?: ApplicationStatus;
}

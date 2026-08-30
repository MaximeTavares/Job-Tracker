import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { type Auth, google, type gmail_v1 } from 'googleapis';
import type { EmailContent } from '../classification/classification.types';
import { requireEnv } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';

export const PROCESSED_LABEL_NAME = 'JobTracker/Traité';
/** Scope OAuth nécessaire pour lire ET modifier les labels (archivage). */
export const GMAIL_MODIFY_SCOPE =
  'https://www.googleapis.com/auth/gmail.modify';
const TOKEN_ROW_ID = 1;

/**
 * Longueur max du corps transmis au classifieur. Le contenu utile pour classer
 * un email de candidature tient dans les premières lignes ; au-delà on ne paie
 * que des tokens (signatures, disclaimers, threads cités).
 */
const EMAIL_BODY_MAX_CHARS = 1500;

export interface InboxMessageRef {
  id: string;
  threadId: string;
}

@Injectable()
export class GmailService implements OnModuleInit {
  private readonly logger = new Logger(GmailService.name);
  private oauth2!: Auth.OAuth2Client;
  private gmail!: gmail_v1.Gmail;
  private processedLabelId?: string;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    this.oauth2 = new google.auth.OAuth2(
      requireEnv('GOOGLE_CLIENT_ID'),
      requireEnv('GOOGLE_CLIENT_SECRET'),
      requireEnv('GOOGLE_REDIRECT_URI'),
    );

    const token = await this.prisma.gmailToken.findUnique({
      where: { id: TOKEN_ROW_ID },
    });
    if (!token) {
      throw new Error(
        "Aucun refresh token Gmail en base. Lance d'abord `npm run gmail:auth`.",
      );
    }
    this.oauth2.setCredentials({ refresh_token: token.refreshToken });

    // Persiste un éventuel refresh token renouvelé (rotation).
    this.oauth2.on('tokens', (tokens) => {
      if (!tokens.refresh_token) {
        return;
      }
      void this.prisma.gmailToken
        .update({
          where: { id: TOKEN_ROW_ID },
          data: {
            refreshToken: tokens.refresh_token,
            scope: tokens.scope ?? null,
          },
        })
        .catch((err: unknown) =>
          this.logger.warn(`Échec persistance refresh token: ${String(err)}`),
        );
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2 });
  }

  /** Retourne l'id du label "JobTracker/Traité", le créant si nécessaire. */
  async ensureProcessedLabel(): Promise<string> {
    if (this.processedLabelId) {
      return this.processedLabelId;
    }
    const { data } = await this.gmail.users.labels.list({ userId: 'me' });
    const existing = data.labels?.find((l) => l.name === PROCESSED_LABEL_NAME);
    if (existing?.id) {
      this.processedLabelId = existing.id;
      return existing.id;
    }
    const created = await this.gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: PROCESSED_LABEL_NAME,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });
    if (!created.data.id) {
      throw new Error(
        'Création du label "JobTracker/Traité" sans id retourné.',
      );
    }
    this.processedLabelId = created.data.id;
    return created.data.id;
  }

  /** Emails de l'INBOX pas encore marqués "Traité" (30 derniers jours). */
  async listInboxToProcess(max = 100): Promise<InboxMessageRef[]> {
    const refs: InboxMessageRef[] = [];
    let pageToken: string | undefined;
    do {
      const { data } = await this.gmail.users.messages.list({
        userId: 'me',
        q: `in:inbox -label:"${PROCESSED_LABEL_NAME}" newer_than:30d`,
        maxResults: 100,
        pageToken,
      });
      for (const m of data.messages ?? []) {
        if (m.id && m.threadId) {
          refs.push({ id: m.id, threadId: m.threadId });
        }
      }
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken && refs.length < max);
    return refs;
  }

  async getEmail(id: string): Promise<EmailContent> {
    const { data } = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });
    const headers = data.payload?.headers ?? [];
    const header = (name: string): string =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? '';

    const rawBody =
      extractPlainText(data.payload ?? undefined) || data.snippet || '';
    const dateMs = data.internalDate
      ? Number.parseInt(data.internalDate, 10)
      : Date.now();

    return {
      id,
      threadId: data.threadId ?? id,
      from: header('From'),
      subject: header('Subject'),
      date: new Date(Number.isFinite(dateMs) ? dateMs : Date.now()),
      body: cleanEmailBody(rawBody),
    };
  }

  /** Pose le label "Traité" ; retire INBOX (archive) si `archive` est vrai. */
  async markProcessed(
    id: string,
    opts: { labelId: string; archive: boolean },
  ): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        addLabelIds: [opts.labelId],
        removeLabelIds: opts.archive ? ['INBOX'] : [],
      },
    });
  }
}

function decodeBase64Url(data?: string | null): string {
  if (!data) {
    return '';
  }
  return Buffer.from(data, 'base64url').toString('utf-8');
}

/** Renvoie le meilleur texte disponible : `text/plain` en priorité, sinon HTML nettoyé. */
export function extractPlainText(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) {
    return '';
  }
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const text = extractPlainText(child);
    if (text) {
      return text;
    }
  }
  if (part.mimeType === 'text/html' && part.body?.data) {
    return stripHtml(decodeBase64Url(part.body.data));
  }
  return '';
}

/**
 * Coupe le bruit (threads cités, signatures, en-têtes de transfert, disclaimers
 * légaux), réduit les blancs et tronque à {@link EMAIL_BODY_MAX_CHARS}.
 */
export function cleanEmailBody(text: string): string {
  if (!text) {
    return '';
  }

  let out = text.replace(/\r\n/g, '\n');

  // Marqueurs de frontière : on coupe à la première occurrence rencontrée.
  const boundaries: RegExp[] = [
    /\nLe .{0,120}?\ba écrit\s*:/i, // thread cité Gmail FR
    /\nOn .{0,120}?\bwrote:/i, // thread cité Gmail EN
    /\nDe\s*:\s.+\n(Envoyé|Date)\s*:/i, // en-tête de transfert Outlook FR
    /\nFrom:\s.+\nSent:/i, // en-tête de transfert Outlook EN
    /\n-{2,}\s*(Message d'origine|Original Message)\s*-{2,}/i, // séparateur "message d'origine"
    /\n_{5,}/, // séparateur Outlook
    /\n--\s*\n/, // délimiteur de signature
    /\n>\s?.*(\n>.*)*$/, // bloc cité en fin de message
    /\nCe message (électronique )?et (toutes )?(les )?pièces jointes/i, // disclaimer FR
    /\nThis (e-?mail|message)( and any attachments)?/i, // disclaimer EN
    /\n(Avis de confidentialité|Confidentiality (Notice|Warning))/i, // disclaimer
  ];

  let cutAt = out.length;
  for (const re of boundaries) {
    const match = re.exec(out);
    if (match && match.index < cutAt) {
      cutAt = match.index;
    }
  }
  out = out.slice(0, cutAt);

  out = out
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (out.length > EMAIL_BODY_MAX_CHARS) {
    out = out.slice(0, EMAIL_BODY_MAX_CHARS).trimEnd() + '…';
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

import { Injectable, Logger } from '@nestjs/common';
import { optionalEnv } from '../config/app-config';
import type { CategoryEntry, RunSummary } from './discord.types';

const EMBED_COLOR = 0x2ecc71;
const FIELD_VALUE_LIMIT = 1024;

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly webhookUrl = optionalEnv('DISCORD_WEBHOOK_URL', '');

  async sendRunSummary(summary: RunSummary): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('DISCORD_WEBHOOK_URL non défini — résumé non envoyé.');
      return;
    }

    const payload = { embeds: [buildEmbed(summary)] };

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Discord a répondu ${res.status} : ${text}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Envoi Discord échoué : ${String(err)}`);
    }
  }
}

function buildEmbed(summary: RunSummary): Record<string, unknown> {
  const fields: DiscordEmbedField[] = [
    { name: 'Scannés', value: `${summary.scanned} emails`, inline: true },
    { name: 'Ignorés', value: `${summary.ignored}`, inline: true },
  ];
  if (summary.errors > 0) {
    fields.push({ name: 'Erreurs', value: `${summary.errors}`, inline: true });
  }
  fields.push(
    {
      name: '✅ Confirmations',
      value:
        formatEntries(summary.byCategory.CONFIRMATION_CANDIDATURE, true) ||
        'Aucune',
      inline: false,
    },
    {
      name: '❌ Refus',
      value: formatEntries(summary.byCategory.REFUS, false) || 'Aucun',
      inline: false,
    },
    {
      name: '🎯 Entretiens',
      value: formatEntries(summary.byCategory.ENTRETIEN, true) || 'Aucun',
      inline: false,
    },
  );

  return {
    title: `📬 Job Tracker — run du ${summary.at.toLocaleString('fr-FR')}`,
    color: EMBED_COLOR,
    fields,
    footer: { text: 'Emails de candidature/refus archivés automatiquement' },
  };
}

function formatEntries(entries: CategoryEntry[], withRole: boolean): string {
  if (entries.length === 0) {
    return '';
  }
  const lines = entries.map((entry) => {
    const company = entry.company || '(inconnu)';
    return withRole && entry.role
      ? `• ${company} — ${entry.role}`
      : `• ${company}`;
  });

  let out = '';
  let shown = 0;
  for (const line of lines) {
    if ((out + line + '\n').length > FIELD_VALUE_LIMIT - 20) {
      break;
    }
    out += line + '\n';
    shown += 1;
  }
  const rest = lines.length - shown;
  if (rest > 0) {
    out += `… (+${rest} autres)`;
  }
  return out.trimEnd();
}

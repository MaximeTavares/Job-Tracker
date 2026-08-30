import { Injectable, Logger } from '@nestjs/common';
import { ClassificationService } from '../classification/classification.service';
import { CATEGORY_TO_STATUS } from '../classification/classification.types';
import { DiscordService } from '../discord/discord.service';
import { emptyByCategory, type RunSummary } from '../discord/discord.types';
import { GmailService } from '../gmail/gmail.service';
import { PrismaService } from '../prisma/prisma.service';

const ARCHIVED_CATEGORIES = new Set(['CONFIRMATION_CANDIDATURE', 'REFUS']);
const UNKNOWN_COMPANY = '(inconnu)';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly gmail: GmailService,
    private readonly classification: ClassificationService,
    private readonly discord: DiscordService,
    private readonly prisma: PrismaService,
  ) {}

  async run(): Promise<RunSummary> {
    const startedAt = Date.now();
    const byCategory = emptyByCategory();
    let scanned = 0;
    let ignored = 0;
    let errors = 0;

    const labelId = await this.gmail.ensureProcessedLabel();
    const refs = await this.gmail.listInboxToProcess();
    this.logger.log(`${refs.length} email(s) à traiter.`);

    for (const ref of refs) {
      try {
        const email = await this.gmail.getEmail(ref.id);

        if (!email.subject.trim() && !email.body.trim()) {
          ignored += 1;
          await this.gmail.markProcessed(ref.id, { labelId, archive: false });
          continue;
        }

        const result = await this.classification.classify(email);
        const status = CATEGORY_TO_STATUS[result.category];
        const eventAt = email.date;
        const company = result.company || UNKNOWN_COMPANY;

        await this.prisma.application.upsert({
          where: { gmailThreadId: ref.threadId },
          create: {
            company,
            role: result.role,
            platform: result.platform,
            appliedAt: eventAt,
            status,
            gmailThreadId: ref.threadId,
            lastEventAt: eventAt,
          },
          update: {
            status,
            lastEventAt: eventAt,
            // On ne réécrit que ce que Claude a effectivement extrait,
            // pour ne pas écraser une saisie manuelle dans Prisma Studio.
            ...(result.company ? { company: result.company } : {}),
            ...(result.role ? { role: result.role } : {}),
            ...(result.platform ? { platform: result.platform } : {}),
          },
        });

        const archive = ARCHIVED_CATEGORIES.has(result.category);
        await this.gmail.markProcessed(ref.id, { labelId, archive });

        byCategory[result.category].push({ company, role: result.role });
        scanned += 1;
        this.logger.log(
          `${ref.id} → ${result.category} (${company}) [${result.confidence}]`,
        );
      } catch (err: unknown) {
        errors += 1;
        this.logger.error(
          `Échec sur l'email ${ref.id} : ${err instanceof Error ? err.stack : String(err)}`,
        );
      }
    }

    const summary: RunSummary = {
      at: new Date(),
      durationMs: Date.now() - startedAt,
      scanned,
      ignored,
      errors,
      byCategory,
    };

    this.logger.log(
      `Run terminé : ${JSON.stringify({
        scanned,
        ignored,
        errors,
        durationMs: summary.durationMs,
      })}`,
    );
    await this.discord.sendRunSummary(summary);
    return summary;
  }
}

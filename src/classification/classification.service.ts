import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { optionalEnv } from '../config/app-config';
import { CLASSIFICATION_PROMPT } from './classification.prompt';
import {
  CATEGORIES,
  type Category,
  type ClassificationResult,
  type Confidence,
  type EmailContent,
} from './classification.types';

export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');

const TOOL_NAME = 'record_classification';

const CLASSIFICATION_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Enregistre la classification et les métadonnées extraites d'un email de candidature.",
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['category', 'company', 'role', 'platform', 'confidence'],
    properties: {
      category: { type: 'string', enum: [...CATEGORIES] },
      company: {
        type: 'string',
        description:
          "Nom de l'entreprise (chaîne vide si vraiment introuvable).",
      },
      role: {
        type: ['string', 'null'],
        description: 'Intitulé du poste, ou null si absent.',
      },
      platform: {
        type: ['string', 'null'],
        description:
          "Plateforme d'origine (LinkedIn, Indeed, Welcome to the Jungle, APEC...), ou null.",
      },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
  },
};

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);
  private readonly model = optionalEnv(
    'CLASSIFICATION_MODEL',
    'claude-haiku-4-5',
  );

  constructor(@Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic) {}

  async classify(email: EmailContent): Promise<ClassificationResult> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      // Bloc system en tableau pour poser un point de cache : couvre le schéma
      // de l'outil + le system prompt (ordre de rendu tools -> system -> messages),
      // identiques à chaque appel du run.
      // NB : inerte sur claude-haiku-4-5 (préfixe cacheable min. 4096 tokens, on
      // est très en dessous) ; effectif si le préfixe statique dépasse ce seuil
      // ou sur un modèle au minimum plus bas.
      system: [
        {
          type: 'text',
          text: CLASSIFICATION_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [CLASSIFICATION_TOOL],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content: formatEmail(email) }],
    });

    const usage = message.usage;
    this.logger.log(
      `classify: in=${usage.input_tokens} out=${usage.output_tokens} ` +
        `cache_read=${usage.cache_read_input_tokens ?? 0}`,
    );

    const toolUse = message.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Réponse Claude sans bloc tool_use exploitable.');
    }
    return normalize(toolUse.input);
  }
}

function formatEmail(email: EmailContent): string {
  // email.body est déjà nettoyé et borné par GmailService.getEmail (cleanEmailBody).
  return [
    `De : ${email.from}`,
    `Date : ${email.date.toISOString()}`,
    `Objet : ${email.subject}`,
    '',
    email.body,
  ].join('\n');
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Sortie de classification invalide (objet attendu).');
  }
  return value as Record<string, unknown>;
}

function toTrimmedStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function normalize(input: unknown): ClassificationResult {
  const record = asRecord(input);

  const rawCategory =
    typeof record.category === 'string' ? record.category : 'AUTRE';
  const category: Category = (CATEGORIES as readonly string[]).includes(
    rawCategory,
  )
    ? (rawCategory as Category)
    : 'AUTRE';

  const confidence: Confidence =
    record.confidence === 'high' ||
    record.confidence === 'medium' ||
    record.confidence === 'low'
      ? record.confidence
      : 'low';

  return {
    category,
    company: typeof record.company === 'string' ? record.company : '',
    role: toTrimmedStringOrNull(record.role),
    platform: toTrimmedStringOrNull(record.platform),
    confidence,
  };
}

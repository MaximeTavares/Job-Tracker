import { Test } from '@nestjs/testing';
import { CLASSIFICATION_PROMPT } from './classification.prompt';
import {
  ANTHROPIC_CLIENT,
  ClassificationService,
} from './classification.service';
import type { EmailContent } from './classification.types';

const email: EmailContent = {
  id: 'm1',
  threadId: 't1',
  from: 'Recrutement <rh@acme.example>',
  subject: 'Votre candidature',
  date: new Date('2026-08-30T10:00:00Z'),
  body: 'Nous confirmons la bonne réception de votre candidature.',
};

const USAGE = {
  input_tokens: 42,
  output_tokens: 7,
  cache_read_input_tokens: 0,
};

async function buildService(create: jest.Mock): Promise<ClassificationService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ClassificationService,
      { provide: ANTHROPIC_CLIENT, useValue: { messages: { create } } },
    ],
  }).compile();
  return moduleRef.get(ClassificationService);
}

describe('ClassificationService', () => {
  it('parse le bloc tool_use et appelle Claude avec les bons paramètres', async () => {
    const create = jest.fn().mockResolvedValue({
      usage: USAGE,
      content: [
        { type: 'text', text: 'ok' },
        {
          type: 'tool_use',
          id: 'tu1',
          name: 'record_classification',
          input: {
            category: 'CONFIRMATION_CANDIDATURE',
            company: 'Acme',
            role: 'Développeur',
            platform: null,
            confidence: 'high',
          },
        },
      ],
    });

    const result = await (await buildService(create)).classify(email);

    expect(result).toEqual({
      category: 'CONFIRMATION_CANDIDATURE',
      company: 'Acme',
      role: 'Développeur',
      platform: null,
      confidence: 'high',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        tool_choice: { type: 'tool', name: 'record_classification' },
        system: [
          {
            type: 'text',
            text: CLASSIFICATION_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
      }),
    );
  });

  it('retombe sur AUTRE / low quand la sortie est incohérente', async () => {
    const create = jest.fn().mockResolvedValue({
      usage: USAGE,
      content: [
        {
          type: 'tool_use',
          id: 'tu2',
          name: 'record_classification',
          input: {
            category: 'PAS_UNE_CATEGORIE',
            company: 42,
            role: '',
            platform: '   ',
            confidence: 'énorme',
          },
        },
      ],
    });

    const result = await (await buildService(create)).classify(email);

    expect(result).toEqual({
      category: 'AUTRE',
      company: '',
      role: null,
      platform: null,
      confidence: 'low',
    });
  });

  it('lève une erreur si la réponse ne contient aucun tool_use', async () => {
    const create = jest.fn().mockResolvedValue({
      usage: USAGE,
      content: [{ type: 'text', text: 'rien' }],
    });

    await expect((await buildService(create)).classify(email)).rejects.toThrow(
      /tool_use/,
    );
  });
});

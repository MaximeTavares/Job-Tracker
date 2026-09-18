import { Test } from '@nestjs/testing';
import { ClassificationService } from '../classification/classification.service';
import type { EmailContent } from '../classification/classification.types';
import { DiscordService } from '../discord/discord.service';
import { GmailService } from '../gmail/gmail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from './sync.service';

function mkEmail(over: Partial<EmailContent> = {}): EmailContent {
  return {
    id: 'm1',
    threadId: 't1',
    from: 'rh@acme.example',
    subject: 'Sujet',
    date: new Date('2026-08-30T09:00:00Z'),
    body: 'corps du message',
    ...over,
  };
}

describe('SyncService', () => {
  let gmail: {
    ensureProcessedLabel: jest.Mock;
    listInboxToProcess: jest.Mock;
    getEmail: jest.Mock;
    markProcessed: jest.Mock;
  };
  let classification: { classify: jest.Mock };
  let discord: { sendRunSummary: jest.Mock };
  let prisma: { application: { upsert: jest.Mock } };
  let service: SyncService;

  beforeEach(async () => {
    gmail = {
      ensureProcessedLabel: jest.fn().mockResolvedValue('LBL'),
      listInboxToProcess: jest.fn().mockResolvedValue([]),
      getEmail: jest.fn(),
      markProcessed: jest.fn().mockResolvedValue(undefined),
    };
    classification = { classify: jest.fn() };
    discord = { sendRunSummary: jest.fn().mockResolvedValue(undefined) };
    prisma = { application: { upsert: jest.fn().mockResolvedValue({}) } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: GmailService, useValue: gmail },
        { provide: ClassificationService, useValue: classification },
        { provide: DiscordService, useValue: discord },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(SyncService);
  });

  it('archive CONFIRMATION_CANDIDATURE et REFUS, pose le label pour toutes les catégories', async () => {
    gmail.listInboxToProcess.mockResolvedValue([
      { id: 'm1', threadId: 't1' },
      { id: 'm2', threadId: 't2' },
      { id: 'm3', threadId: 't3' },
    ]);
    gmail.getEmail
      .mockResolvedValueOnce(mkEmail({ id: 'm1', threadId: 't1' }))
      .mockResolvedValueOnce(mkEmail({ id: 'm2', threadId: 't2' }))
      .mockResolvedValueOnce(mkEmail({ id: 'm3', threadId: 't3' }));
    classification.classify
      .mockResolvedValueOnce({
        category: 'CONFIRMATION_CANDIDATURE',
        company: 'Acme',
        role: 'Dev',
        platform: 'LinkedIn',
        confidence: 'high',
      })
      .mockResolvedValueOnce({
        category: 'ENTRETIEN',
        company: 'Beta',
        role: null,
        platform: null,
        confidence: 'medium',
      })
      .mockResolvedValueOnce({
        category: 'REFUS',
        company: 'Gamma',
        role: null,
        platform: null,
        confidence: 'low',
      });

    const summary = await service.run();

    expect(gmail.markProcessed).toHaveBeenCalledWith('m1', {
      labelId: 'LBL',
      archive: true,
    });
    expect(gmail.markProcessed).toHaveBeenCalledWith('m2', {
      labelId: 'LBL',
      archive: false,
    });
    expect(gmail.markProcessed).toHaveBeenCalledWith('m3', {
      labelId: 'LBL',
      archive: true,
    });
    expect(summary.scanned).toBe(3);
    expect(summary.byCategory.CONFIRMATION_CANDIDATURE).toEqual([
      { company: 'Acme', role: 'Dev' },
    ]);
    expect(summary.byCategory.ENTRETIEN).toEqual([
      { company: 'Beta', role: null },
    ]);
    expect(discord.sendRunSummary).toHaveBeenCalledTimes(1);
  });

  it('fait un upsert matché sur gmailThreadId', async () => {
    gmail.listInboxToProcess.mockResolvedValue([
      { id: 'm1', threadId: 'THREAD-42' },
    ]);
    gmail.getEmail.mockResolvedValue(mkEmail({ threadId: 'THREAD-42' }));
    classification.classify.mockResolvedValue({
      category: 'REFUS',
      company: 'Acme',
      role: null,
      platform: null,
      confidence: 'high',
    });

    await service.run();

    expect(prisma.application.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gmailThreadId: 'THREAD-42' } }),
    );
  });

  it("n'interrompt pas la boucle si un email échoue", async () => {
    gmail.listInboxToProcess.mockResolvedValue([
      { id: 'm1', threadId: 't1' },
      { id: 'm2', threadId: 't2' },
    ]);
    gmail.getEmail.mockResolvedValue(mkEmail());
    classification.classify
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        category: 'AUTRE',
        company: '',
        role: null,
        platform: null,
        confidence: 'low',
      });

    const summary = await service.run();

    expect(summary.errors).toBe(1);
    expect(summary.scanned).toBe(1);
    expect(discord.sendRunSummary).toHaveBeenCalledTimes(1);
  });

  it('ne persiste pas les emails classés AUTRE, mais les compte et les marque traités', async () => {
    gmail.listInboxToProcess.mockResolvedValue([{ id: 'm1', threadId: 't1' }]);
    gmail.getEmail.mockResolvedValue(mkEmail({ id: 'm1', threadId: 't1' }));
    classification.classify.mockResolvedValue({
      category: 'AUTRE',
      company: '',
      role: null,
      platform: null,
      confidence: 'low',
    });

    const summary = await service.run();

    expect(prisma.application.upsert).not.toHaveBeenCalled();
    expect(summary.scanned).toBe(1);
    expect(gmail.markProcessed).toHaveBeenCalledWith('m1', {
      labelId: 'LBL',
      archive: false,
    });
  });

  it('ignore un email vide, le marque traité sans archiver, sans appeler Claude', async () => {
    gmail.listInboxToProcess.mockResolvedValue([{ id: 'm1', threadId: 't1' }]);
    gmail.getEmail.mockResolvedValue(mkEmail({ subject: '   ', body: '' }));

    const summary = await service.run();

    expect(summary.ignored).toBe(1);
    expect(classification.classify).not.toHaveBeenCalled();
    expect(gmail.markProcessed).toHaveBeenCalledWith('m1', {
      labelId: 'LBL',
      archive: false,
    });
  });
});

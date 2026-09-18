import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let prisma: {
    application: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
  };
  let service: ApplicationsService;

  beforeEach(async () => {
    prisma = {
      application: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  describe('findAll', () => {
    it('ne filtre pas quand status et platform sont absents', async () => {
      await service.findAll({});

      expect(prisma.application.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { lastEventAt: 'desc' },
      });
    });

    it('filtre par status seul', async () => {
      await service.findAll({ status: 'REJECTED' });

      expect(prisma.application.findMany).toHaveBeenCalledWith({
        where: { status: 'REJECTED' },
        orderBy: { lastEventAt: 'desc' },
      });
    });

    it('filtre par platform seule', async () => {
      await service.findAll({ platform: 'LinkedIn' });

      expect(prisma.application.findMany).toHaveBeenCalledWith({
        where: { platform: 'LinkedIn' },
        orderBy: { lastEventAt: 'desc' },
      });
    });

    it('filtre par status et platform', async () => {
      await service.findAll({ status: 'INTERVIEW', platform: 'LinkedIn' });

      expect(prisma.application.findMany).toHaveBeenCalledWith({
        where: { status: 'INTERVIEW', platform: 'LinkedIn' },
        orderBy: { lastEventAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it("lève NotFoundException si l'id est inconnu", async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { company: 'Acme' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.application.update).not.toHaveBeenCalled();
    });

    it('met à jour uniquement les champs fournis', async () => {
      prisma.application.findUnique.mockResolvedValue({ id: 1 });
      prisma.application.update.mockResolvedValue({
        id: 1,
        status: 'INTERVIEW',
      });

      await service.update(1, { status: 'INTERVIEW' });

      expect(prisma.application.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'INTERVIEW' },
      });
    });
  });

  describe('remove', () => {
    it("lève NotFoundException si l'id est inconnu", async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(prisma.application.delete).not.toHaveBeenCalled();
    });

    it('supprime la candidature existante', async () => {
      prisma.application.findUnique.mockResolvedValue({ id: 1 });
      prisma.application.delete.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(prisma.application.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('stats', () => {
    it('zero-fill tous les statuts et calcule le responseRate', async () => {
      prisma.application.count.mockResolvedValue(10);
      prisma.application.groupBy.mockResolvedValue([
        { status: 'CONFIRMED', _count: { _all: 5 } },
        { status: 'REJECTED', _count: { _all: 3 } },
        { status: 'INTERVIEW', _count: { _all: 2 } },
      ]);

      const result = await service.stats();

      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual({
        CONFIRMED: 5,
        REJECTED: 3,
        INTERVIEW: 2,
        INFO_REQUESTED: 0,
        OTHER: 0,
      });
      expect(result.responseRate).toBe(0.5);
    });

    it('renvoie un responseRate de 0 quand il n’y a aucune candidature', async () => {
      prisma.application.count.mockResolvedValue(0);
      prisma.application.groupBy.mockResolvedValue([]);

      const result = await service.stats();

      expect(result.responseRate).toBe(0);
    });
  });
});

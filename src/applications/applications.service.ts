import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListApplicationsQueryDto } from './dto/list-applications.query.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ListApplicationsQueryDto) {
    return this.prisma.application.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.platform ? { platform: filter.platform } : {}),
      },
      orderBy: { lastEventAt: 'desc' },
    });
  }

  async update(id: number, dto: UpdateApplicationDto) {
    const existing = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Candidature ${id} introuvable.`);
    }
    return this.prisma.application.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const existing = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Candidature ${id} introuvable.`);
    }
    return this.prisma.application.delete({ where: { id } });
  }

  async stats(): Promise<ApplicationStats> {
    const total = await this.prisma.application.count();
    const grouped = await this.prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      Object.values(ApplicationStatus).map((status) => [status, 0]),
    ) as Record<ApplicationStatus, number>;
    for (const group of grouped) {
      byStatus[group.status] = group._count._all;
    }

    // Taux de réponse : décisions humaines substantielles uniquement.
    // Exclut CONFIRMED (accusé de réception automatique) et INFO_REQUESTED/AUTRE (ambigus).
    const responseRate =
      total > 0 ? (byStatus.REJECTED + byStatus.INTERVIEW) / total : 0;

    return { total, byStatus, responseRate };
  }
}

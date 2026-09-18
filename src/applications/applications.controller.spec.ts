import { Test } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

describe('ApplicationsController', () => {
  let service: {
    findAll: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    stats: jest.Mock;
  };
  let controller: ApplicationsController;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      stats: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [{ provide: ApplicationsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ApplicationsController);
  });

  it('findAll délègue la query au service', async () => {
    await controller.findAll({ status: 'REJECTED' });

    expect(service.findAll).toHaveBeenCalledWith({ status: 'REJECTED' });
  });

  it('stats délègue au service', async () => {
    await controller.stats();

    expect(service.stats).toHaveBeenCalledTimes(1);
  });

  it('update délègue l’id (converti en number) et le dto au service', async () => {
    await controller.update(42, { company: 'Acme' });

    expect(service.update).toHaveBeenCalledWith(42, { company: 'Acme' });
  });

  it('remove délègue l’id (converti en number) au service', async () => {
    await controller.remove(42);

    expect(service.remove).toHaveBeenCalledWith(42);
  });
});

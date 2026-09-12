import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: (): Promise<Array<{ count: bigint }>> =>
              Promise.resolve([{ count: 16n }]),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports the database as up with a table count', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(result.tables).toBe(16);
  });
});

import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  latencyMs: number;
  tables: number;
  timestamp: string;
}

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Service and PostgreSQL database health' })
  @ApiOkResponse({
    description: 'API reachable; reports database ping latency',
  })
  async check(): Promise<HealthResponse> {
    const start = Date.now();
    try {
      const result = await this.prisma.$queryRaw<
        Array<{ count: bigint }>
      >`SELECT count(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`;
      const tables = Number(result[0]?.count ?? 0);
      return {
        status: 'ok',
        database: 'up',
        latencyMs: Date.now() - start,
        tables,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        database: 'down',
        latencyMs: Date.now() - start,
        tables: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

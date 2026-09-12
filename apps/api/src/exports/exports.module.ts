import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExportSerializer } from './serializer.service';

@Module({
  imports: [ReportsModule],
  controllers: [ExportsController],
  providers: [ExportsService, ExportSerializer],
})
export class ExportsModule {}

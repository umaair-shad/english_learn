import { Module } from '@nestjs/common';
import { VocabularySetsController } from './vocabulary-sets.controller';
import { VocabularySetsService } from './vocabulary-sets.service';

@Module({
  controllers: [VocabularySetsController],
  providers: [VocabularySetsService],
  exports: [VocabularySetsService],
})
export class VocabularySetsModule {}

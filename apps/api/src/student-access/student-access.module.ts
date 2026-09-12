import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { LearningModule } from '../learning/learning.module';
import { StudentAccessController } from './student-access.controller';
import { StudentAccessService } from './student-access.service';

@Module({
  imports: [LearningModule, AssignmentsModule],
  controllers: [StudentAccessController],
  providers: [StudentAccessService],
  exports: [StudentAccessService],
})
export class StudentAccessModule {}

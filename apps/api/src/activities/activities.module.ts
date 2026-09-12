import { Module } from '@nestjs/common';
import { LearningModule } from '../learning/learning.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StudentAccessModule } from '../student-access/student-access.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityEventsService } from './activity-events.service';
import { ActivityLearningService } from './activity-learning.service';
import { ActivitySessionsController } from './activity-sessions.controller';
import { ActivitySessionsService } from './activity-sessions.service';
import { StudentActivitiesController } from './student-activities.controller';
import { StudentActivityController } from './student-activity.controller';
import { PlayAccessController } from './play-access.controller';
import { PlayAccessService } from './play-access.service';

@Module({
  imports: [LearningModule, StudentAccessModule, RealtimeModule],
  controllers: [
    ActivitiesController,
    ActivitySessionsController,
    StudentActivitiesController,
    StudentActivityController,
    PlayAccessController,
  ],
  providers: [
    ActivitiesService,
    ActivityEventsService,
    ActivityLearningService,
    ActivitySessionsService,
    PlayAccessService,
  ],
  exports: [ActivitiesService, ActivitySessionsService, PlayAccessService],
})
export class ActivitiesModule {}

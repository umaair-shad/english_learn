import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AppConfigSchema } from './config/app-config.schema';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HealthModule } from './health/health.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { LearningModule } from './learning/learning.module';
import { StudentAccessModule } from './student-access/student-access.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { VocabularySetsModule } from './vocabulary-sets/vocabulary-sets.module';
import { ActivitiesModule } from './activities/activities.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { ExportsModule } from './exports/exports.module';
import { ImportsModule } from './imports/imports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: AppConfigSchema,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    HealthModule,
    VocabularyModule,
    VocabularySetsModule,
    AssignmentsModule,
    TeachersModule,
    AuthModule,
    StudentsModule,
    LearningModule,
    StudentAccessModule,
    ActivitiesModule,
    RealtimeModule,
    ReportsModule,
    ExportsModule,
    ImportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

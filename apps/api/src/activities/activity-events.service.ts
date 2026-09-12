import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ACTIVITY_EVENT_TYPES,
  ActivityEventType,
  POSTABLE_EVENT_TYPES,
} from './dto/activities.dto';

export interface ActivityEventWrite {
  sessionId: number;
  activityId: number;
  studentId: number;
  vocabularySenseId: number | null;
  eventType: ActivityEventType;
  direction?: string | null;
  response?: string | null;
  isCorrect?: boolean | null;
  responseTimeMs?: number | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
}

export interface ActivityEventDto {
  id: number;
  sessionId: number;
  activityId: number;
  studentId: number;
  vocabularySenseId: number | null;
  eventType: string;
  direction: string | null;
  response: string | null;
  isCorrect: boolean | null;
  responseTimeMs: number | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
}

export const EVENT_TYPES = ACTIVITY_EVENT_TYPES;

/**
 * Single normalized gateway for writing activity events. Every future
 * activity module persists events through this service so no activity-specific
 * event tables or formats can appear. Student identity is always resolved by
 * the caller from the private token -- never from the request body.
 */
@Injectable()
export class ActivityEventsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lifecycle events are reserved for the dedicated session endpoints. */
  static assertPostable(eventType: string): void {
    if (!(POSTABLE_EVENT_TYPES as readonly string[]).includes(eventType)) {
      throw new TypeError(
        `Event type ${eventType} cannot be submitted directly; ` +
          'use the dedicated session endpoint',
      );
    }
  }

  async append(
    tx: Prisma.TransactionClient,
    input: ActivityEventWrite,
  ): Promise<ActivityEventDto> {
    const row = await tx.activity_events.create({
      data: {
        session_id: BigInt(input.sessionId),
        activity_id: BigInt(input.activityId),
        student_id: BigInt(input.studentId),
        vocabulary_sense_id:
          input.vocabularySenseId === null
            ? null
            : BigInt(input.vocabularySenseId),
        event_type: input.eventType,
        direction: input.direction ?? null,
        response: input.response ?? null,
        is_correct: input.isCorrect ?? null,
        response_time_ms: input.responseTimeMs ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        occurred_at: input.occurredAt ?? new Date(),
      },
    });
    return this.toDto(row);
  }

  private toDto(row: {
    id: bigint;
    session_id: bigint;
    activity_id: bigint;
    student_id: bigint;
    vocabulary_sense_id: bigint | null;
    event_type: ActivityEventType;
    direction: string | null;
    response: string | null;
    is_correct: boolean | null;
    response_time_ms: number | null;
    metadata: Prisma.JsonValue;
    occurred_at: Date;
    created_at: Date;
  }): ActivityEventDto {
    return {
      id: Number(row.id),
      sessionId: Number(row.session_id),
      activityId: Number(row.activity_id),
      studentId: Number(row.student_id),
      vocabularySenseId:
        row.vocabulary_sense_id === null
          ? null
          : Number(row.vocabulary_sense_id),
      eventType: row.event_type,
      direction: row.direction,
      response: row.response,
      isCorrect: row.is_correct,
      responseTimeMs:
        row.response_time_ms === null ? null : Number(row.response_time_ms),
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      occurredAt: row.occurred_at.toISOString(),
      createdAt: row.created_at.toISOString(),
    };
  }
}

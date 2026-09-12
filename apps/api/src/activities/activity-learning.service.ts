import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LearningService } from '../learning/learning.service';
import { ReviewRating, ReviewSenseDto } from '../learning/dto/learning.dto';

/**
 * Explicit integration layer between activity events and the existing FSRS
 * learning core.
 *
 * Only events that carry a valid normalized rating (AGAIN/HARD/GOOD/EASY) may
 * reach FSRS. Nothing else in this milestone may touch student scheduling.
 * There is deliberately no hardcoded correct=GOOD / incorrect=AGAIN mapping:
 * the activity supplies the rating and the core validates it.
 */
@Injectable()
export class ActivityLearningService {
  constructor(private readonly learning: LearningService) {}

  async applyAnswerReview(
    tx: Prisma.TransactionClient,
    studentId: number,
    senseId: number,
    rating: ReviewRating,
    responseTimeMs: number | null,
    activityId: number,
  ): Promise<void> {
    const dto = new ReviewSenseDto();
    dto.rating = rating;
    dto.responseTimeMs = responseTimeMs ?? undefined;
    dto.sourceType = 'activity';
    dto.sourceId = activityId;
    await this.learning.review(studentId, senseId, dto, tx);
  }
}

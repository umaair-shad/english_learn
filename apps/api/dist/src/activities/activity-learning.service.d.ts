import { Prisma } from '@prisma/client';
import { LearningService } from '../learning/learning.service';
import { ReviewRating } from '../learning/dto/learning.dto';
export declare class ActivityLearningService {
    private readonly learning;
    constructor(learning: LearningService);
    applyAnswerReview(tx: Prisma.TransactionClient, studentId: number, senseId: number, rating: ReviewRating, responseTimeMs: number | null, activityId: number): Promise<void>;
}

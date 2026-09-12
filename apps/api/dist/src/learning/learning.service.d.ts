import { Prisma } from '@prisma/client';
import { FsrsService } from '../fsrs/fsrs.service';
import { PrismaService } from '../database/prisma.service';
import { DueReviewsQueryDto, LearningStatus, OverrideStateDto, ReviewRating, ReviewSenseDto, StudentVocabularyQueryDto } from './dto/learning.dto';
export interface StudentStateDto {
    id: number;
    studentId: number;
    senseId: number;
    status: LearningStatus;
    firstEncounteredAt: string | null;
    firstLearnedAt: string | null;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
    difficulty: number | null;
    stability: number | null;
    retrievability: number | null;
    lapses: number;
    createdAt: string;
    updatedAt: string;
    isDue: boolean;
}
export interface StudentVocabSenseLite {
    id: number;
    entryId: number;
    lemma: string;
    normalizedLemma: string;
    partOfSpeech: string;
    displayForm: string | null;
    position: number;
    definition: string;
    tags: string[];
    senseIdHint: string | null;
    cefrLevels: string[];
    frequencyRank: number | null;
    translations: Array<{
        id: number;
        text: string;
        senseLabel: string | null;
        matchMethod: string | null;
        matchConfidence: string | null;
    }>;
}
export interface StudentVocabRow {
    state: StudentStateDto;
    sense: StudentVocabSenseLite;
}
export interface PaginatedStudentVocab {
    data: StudentVocabRow[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface StudentVocabDetail {
    state: StudentStateDto;
    sense: StudentVocabSenseLite & {
        wikidataQid: string | null;
        examples: Array<{
            id: number;
            text: string;
            source: string;
            verification: string | null;
        }>;
        cefr: Array<{
            level: string;
            confidence: string;
            requiresReview: boolean;
            source: string | null;
        }>;
        wordnet: Array<{
            synsetId: string;
            definition: string;
            members: string[];
            confidence: string;
        }>;
        categories: Array<{
            code: string;
            name: string;
        }>;
    };
    recentReviews: ReviewHistoryRow[];
}
export interface ReviewHistoryRow {
    id: number;
    rating: ReviewRating | null;
    responseTimeMs: number | null;
    previousStatus: LearningStatus;
    newStatus: LearningStatus;
    previousDifficulty: number | null;
    newDifficulty: number | null;
    previousStability: number | null;
    newStability: number | null;
    previousNextReviewAt: string | null;
    nextReviewAt: string | null;
    sourceType: string;
    sourceId: number | null;
    reviewedAt: string;
    createdAt: string;
}
export interface StudentStateSummary {
    assigned: number;
    encountered: number;
    learning: number;
    reviewing: number;
    mastered: number;
    dueNow: number;
    dueTomorrow: number;
    difficult: number;
    total: number;
}
export declare class LearningService {
    private readonly prisma;
    private readonly fsrs;
    constructor(prisma: PrismaService, fsrs: FsrsService);
    assign(studentId: number, senseId: number, sourceType?: string): Promise<StudentStateDto>;
    list(studentId: number, query: StudentVocabularyQueryDto): Promise<PaginatedStudentVocab>;
    detail(studentId: number, senseId: number): Promise<StudentVocabRow & {
        sense: StudentVocabSenseLite & {
            examples: Array<{
                id: number;
                text: string;
                source: string;
                verification: string | null;
            }>;
            wikidataQid: string | null;
            cefr: Array<{
                level: string;
                confidence: string;
                requiresReview: boolean;
                source: string | null;
            }>;
            wordnet: Array<{
                synsetId: string;
                definition: string;
                members: string[];
                confidence: string;
            }>;
            categories: Array<{
                code: string;
                name: string;
            }>;
        };
        recentReviews: ReviewHistoryRow[];
    }>;
    review(studentId: number, senseId: number, dto: ReviewSenseDto, tx?: Prisma.TransactionClient): Promise<void>;
    override(studentId: number, senseId: number, dto: OverrideStateDto): Promise<StudentStateDto>;
    due(studentId: number, query: DueReviewsQueryDto): Promise<PaginatedStudentVocab>;
    summary(studentId: number): Promise<StudentStateSummary>;
    distribution(studentId: number): Promise<{
        cefr: Array<{
            level: string;
            count: number;
        }>;
        categories: Array<{
            code: string;
            name: string;
            count: number;
        }>;
        difficult: Array<{
            senseId: number;
            lemma: string;
            partOfSpeech: string;
            incorrectCount: number;
            lapses: number;
            status: string;
        }>;
    }>;
    unassign(studentId: number, senseId: number): Promise<{
        removed: true;
    }>;
    private mapRows;
    private loadTranslations;
    private buildStudentWhere;
    private isDueRecord;
    private nextStatus;
    private toStateDto;
    private toHistoryRow;
    private lockOrCreateState;
    private rowToPrismaState;
    private assertStudent;
    private assertSense;
    private assertStudentTx;
    private assertSenseTx;
}

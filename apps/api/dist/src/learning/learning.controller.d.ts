import { AssignSenseDto, DueReviewsQueryDto, OverrideStateDto, ReviewSenseDto, StudentVocabularyQueryDto } from './dto/learning.dto';
import { LearningService } from './learning.service';
export declare class LearningController {
    private readonly learning;
    constructor(learning: LearningService);
    listVocabulary(studentId: number, query: StudentVocabularyQueryDto): Promise<import("./learning.service").PaginatedStudentVocab>;
    due(studentId: number, query: DueReviewsQueryDto): Promise<import("./learning.service").PaginatedStudentVocab>;
    summary(studentId: number): Promise<import("./learning.service").StudentStateSummary>;
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
    senseDetail(studentId: number, senseId: number): Promise<import("./learning.service").StudentVocabRow & {
        sense: import("./learning.service").StudentVocabSenseLite & {
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
        recentReviews: import("./learning.service").ReviewHistoryRow[];
    }>;
    assign(studentId: number, senseId: number, body: AssignSenseDto): Promise<import("./learning.service").StudentStateDto>;
    review(studentId: number, senseId: number, body: ReviewSenseDto): Promise<import("./learning.service").StudentVocabRow & {
        sense: import("./learning.service").StudentVocabSenseLite & {
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
        recentReviews: import("./learning.service").ReviewHistoryRow[];
    }>;
    unassign(studentId: number, senseId: number): Promise<{
        removed: true;
    }>;
    override(studentId: number, senseId: number, body: OverrideStateDto): Promise<import("./learning.service").StudentStateDto>;
}

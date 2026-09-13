import { AssignmentsService } from '../assignments/assignments.service';
import { LearningService } from '../learning/learning.service';
import { DueReviewsQueryDto, StudentVocabularyQueryDto } from '../learning/dto/learning.dto';
import { StudentAccessService } from './student-access.service';
export declare class StudentAccessController {
    private readonly access;
    private readonly learning;
    private readonly assignmentsService;
    constructor(access: StudentAccessService, learning: LearningService, assignmentsService: AssignmentsService);
    resolve(token: string): Promise<import("./student-access.service").StudentAccessResolution>;
    summary(token: string): Promise<import("../learning/learning.service").StudentStateSummary>;
    vocabulary(token: string, query: StudentVocabularyQueryDto): Promise<import("../learning/learning.service").PaginatedStudentVocab>;
    due(token: string, query: DueReviewsQueryDto): Promise<import("../learning/learning.service").PaginatedStudentVocab>;
    assignments(token: string): Promise<{
        id: number;
        title: string;
        description: string | null;
        status: string;
        dueAt: string | null;
        assignedAt: string | null;
        completedAt: string | null;
        createdAt: string;
        itemCount: number;
        masteredCount: number;
        learningCount: number;
        progress: number;
    }[]>;
    assignment(token: string, assignmentId: number): Promise<import("../assignments/assignments.service").AssignmentDetail>;
}

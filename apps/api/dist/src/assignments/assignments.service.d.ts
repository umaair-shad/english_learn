import { PrismaService } from '../database/prisma.service';
import { AssignmentQueryDto, CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignments.dto';
export interface TranslationRow {
    vocabularySenseId: bigint;
    id: bigint;
    text: string;
    senseLabel: string | null;
    matchMethod: string | null;
    matchConfidence: string | null;
}
export interface CategoryRow {
    vocabularySenseId: bigint;
    code: string;
    name: string;
}
export declare class AssignmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: AssignmentQueryDto): Promise<{
        data: Array<{
            id: number;
            studentId: number;
            title: string;
            description: string | null;
            status: string;
            assignedAt: string | null;
            dueAt: string | null;
            completedAt: string | null;
            createdAt: string;
            student: {
                id: number;
                displayName: string;
                firstName: string;
                lastName: string | null;
            };
            itemCount: number;
            masteredCount: number;
            progress: number;
        }>;
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    create(teacherId: number, dto: CreateAssignmentDto): Promise<unknown>;
    getById(id: number): Promise<AssignmentDetail>;
    update(id: number, dto: UpdateAssignmentDto): Promise<AssignmentDetail>;
    remove(id: number): Promise<{
        id: number;
        cancelled: boolean;
    }>;
    belongsToStudent(id: number, studentId: number): Promise<boolean>;
    listForStudent(studentId: number): Promise<Array<{
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
        progress: number;
    }>>;
    private requireExistingSenseIds;
    private loadSetSenseRows;
    private loadProgress;
    private loadTranslations;
    private loadCategories;
    private groupBy;
}
export interface AssignmentDetail {
    id: number;
    studentId: number;
    title: string;
    description: string | null;
    status: string;
    assignedAt: string | null;
    dueAt: string | null;
    completedAt: string | null;
    createdAt: string;
    student: {
        id: number;
        displayName: string;
        firstName: string;
        lastName: string | null;
        isActive: boolean;
    };
    totalItems: number;
    progress: {
        total: number;
        mastered: number;
        percent: number;
        countByStatus: {
            assigned: number;
            encountered: number;
            learning: number;
            reviewing: number;
            mastered: number;
        };
    };
    items: Array<{
        senseId: number;
        entryId: number;
        lemma: string;
        normalizedLemma: string;
        partOfSpeech: string;
        displayForm: string | null;
        position: number;
        definition: string;
        cefrLevels: string[];
        frequencyRank: number | null;
        translations: Array<{
            id: number;
            text: string;
            senseLabel: string | null;
            matchMethod: string | null;
            matchConfidence: string | null;
        }>;
        categories: Array<{
            code: string;
            name: string;
        }>;
        source: {
            type: string;
            sourceSetId: number | null;
        };
        learning: string | null;
        reviewCount: number;
        nextReviewAt: string | null;
    }>;
}

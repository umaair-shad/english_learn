import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { AssignmentsService } from './assignments.service';
import { AssignmentQueryDto, CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignments.dto';
export declare class AssignmentsController {
    private readonly service;
    constructor(service: AssignmentsService);
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
    create(req: AuthenticatedRequest, body: CreateAssignmentDto): Promise<unknown>;
    getById(id: number): Promise<import("./assignments.service").AssignmentDetail>;
    update(id: number, body: UpdateAssignmentDto): Promise<import("./assignments.service").AssignmentDetail>;
    remove(id: number): Promise<{
        id: number;
        cancelled: boolean;
    }>;
}

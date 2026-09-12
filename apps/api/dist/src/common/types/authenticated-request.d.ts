import type { Request } from 'express';
export interface AuthenticatedTeacher {
    teacherId: number;
    email: string;
}
export interface AuthenticatedRequest extends Request {
    teacher?: AuthenticatedTeacher;
}

export declare class CreateStudentDto {
    firstName: string;
    lastName?: string;
    displayName: string;
    notes?: string;
}
export declare class UpdateStudentDto {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    notes?: string;
    isActive?: boolean;
}
export declare class StudentQueryDto {
    search?: string;
    isActive?: boolean;
    page: number;
    limit: number;
    sort: 'createdAt' | 'displayName' | 'firstName' | 'updatedAt';
    order: 'asc' | 'desc';
}
export declare class AccessTokenOptionsDto {
    expiresInSeconds?: number;
}

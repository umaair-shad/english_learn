import { AccessTokenOptionsDto, CreateStudentDto, StudentQueryDto, UpdateStudentDto } from './dto/students.dto';
import { StudentsService } from './students.service';
export declare class StudentsController {
    private readonly students;
    constructor(students: StudentsService);
    list(query: StudentQueryDto): Promise<import("./students.service").PaginatedStudents>;
    create(body: CreateStudentDto): Promise<import("./students.service").StudentDto>;
    get(id: number): Promise<import("./students.service").StudentDto & {
        accessToken: import("./students.service").StudentAccessTokenDto | null;
    }>;
    update(id: number, body: UpdateStudentDto): Promise<import("./students.service").StudentDto & {
        accessToken: import("./students.service").StudentAccessTokenDto | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        deactivated: boolean;
    }>;
    createToken(id: number, body: AccessTokenOptionsDto): Promise<import("./students.service").CreatedAccessToken>;
    regenerateToken(id: number, body: AccessTokenOptionsDto): Promise<import("./students.service").CreatedAccessToken>;
    revokeToken(id: number): Promise<{
        id: number;
        revoked: boolean;
    }>;
}

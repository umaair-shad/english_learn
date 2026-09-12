import type { Response } from 'express';
import type { AuthenticatedTeacher } from '../common/types/authenticated-request';
import { TeachersService } from '../teachers/teachers.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    private readonly teachers;
    constructor(authService: AuthService, teachers: TeachersService);
    login(body: LoginDto, res: Response): Promise<{
        readonly accessToken: string;
        readonly expiresIn: string;
        readonly teacher: import("../teachers/teachers.service").TeacherProfile;
    }>;
    logout(res: Response): {
        ok: true;
    };
    changePassword(teacher: AuthenticatedTeacher | undefined, body: ChangePasswordDto): Promise<{
        ok: true;
    }>;
    me(teacher: AuthenticatedTeacher | undefined): Promise<{
        teacher: import("../teachers/teachers.service").TeacherProfile;
    }>;
}

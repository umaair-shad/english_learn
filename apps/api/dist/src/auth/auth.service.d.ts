import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { TeachersService, type TeacherProfile } from '../teachers/teachers.service';
export interface LoginResult {
    accessToken: string;
    expiresIn: string;
    teacher: TeacherProfile;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly teachers;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService, teachers: TeachersService);
    login(email: string, password: string): Promise<LoginResult>;
    changePassword(teacherId: number, currentPassword: string, newPassword: string): Promise<void>;
}

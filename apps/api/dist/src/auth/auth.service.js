"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcryptjs_1 = require("bcryptjs");
const prisma_service_1 = require("../database/prisma.service");
const teachers_service_1 = require("../teachers/teachers.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    config;
    teachers;
    constructor(prisma, jwtService, config, teachers) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.teachers = teachers;
    }
    async login(email, password) {
        const normalizedEmail = email.toLowerCase();
        const teacher = await this.prisma.teacher_accounts.findUnique({
            where: { email: normalizedEmail },
        });
        const valid = teacher !== null &&
            teacher.is_active &&
            (await (0, bcryptjs_1.compare)(password, teacher.password_hash));
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const payload = { sub: teacher.id.toString(), email: teacher.email };
        const rawExpiresIn = this.config.get('ACCESS_TOKEN_TTL') ?? '15m';
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: rawExpiresIn,
        });
        await this.teachers.touchLastLogin(Number(teacher.id));
        return {
            accessToken,
            expiresIn: rawExpiresIn,
            teacher: this.teachers.toProfile(teacher),
        };
    }
    async changePassword(teacherId, currentPassword, newPassword) {
        const teacher = await this.prisma.teacher_accounts.findUnique({
            where: { id: BigInt(teacherId) },
        });
        if (!teacher || !teacher.is_active) {
            throw new common_1.UnauthorizedException('Not authenticated');
        }
        const valid = await (0, bcryptjs_1.compare)(currentPassword, teacher.password_hash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const passwordHash = await (0, bcryptjs_1.hash)(newPassword, 10);
        await this.prisma.teacher_accounts.update({
            where: { id: teacher.id },
            data: { password_hash: passwordHash, updated_at: new Date() },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        teachers_service_1.TeachersService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
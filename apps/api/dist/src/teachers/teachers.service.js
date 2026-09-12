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
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let TeachersService = class TeachersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return this.prisma.teacher_accounts.findUnique({
            where: { email: email.toLowerCase() },
        });
    }
    async getProfile(id) {
        const teacher = await this.prisma.teacher_accounts.findUnique({
            where: { id: BigInt(id) },
        });
        if (!teacher)
            throw new common_1.NotFoundException('Teacher not found');
        return this.toProfile(teacher);
    }
    async touchLastLogin(id) {
        await this.prisma.teacher_accounts.update({
            where: { id: BigInt(id) },
            data: { last_login_at: new Date() },
        });
    }
    async upsertCredentials(email, passwordHash, displayName) {
        const normalized = email.toLowerCase();
        const existing = await this.prisma.teacher_accounts.findUnique({
            where: { email: normalized },
        });
        if (existing) {
            return this.prisma.teacher_accounts.update({
                where: { id: existing.id },
                data: { password_hash: passwordHash, display_name: displayName },
            });
        }
        return this.prisma.teacher_accounts.create({
            data: {
                email: normalized,
                password_hash: passwordHash,
                display_name: displayName,
            },
        });
    }
    toProfile(teacher) {
        return {
            id: Number(teacher.id),
            email: teacher.email,
            displayName: teacher.display_name,
        };
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map
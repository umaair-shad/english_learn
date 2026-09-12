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
exports.StudentAccessService = void 0;
const common_1 = require("@nestjs/common");
const access_token_util_1 = require("../common/utils/access-token.util");
const prisma_service_1 = require("../database/prisma.service");
let StudentAccessService = class StudentAccessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolve(rawToken) {
        const record = await this.requireValidToken(rawToken);
        return {
            student: {
                id: Number(record.students.id),
                firstName: record.students.first_name,
                lastName: record.students.last_name,
                displayName: record.students.display_name,
            },
            token: {
                prefix: record.token_prefix,
                expiresAt: record.expires_at?.toISOString() ?? null,
            },
        };
    }
    async studentIdFromToken(rawToken) {
        const record = await this.requireValidToken(rawToken);
        return Number(record.students.id);
    }
    async requireValidToken(rawToken) {
        const record = await this.prisma.student_access_tokens.findUnique({
            where: { token_hash: (0, access_token_util_1.hashAccessToken)(rawToken) },
            include: { students: true },
        });
        const valid = record !== null &&
            record.is_active &&
            record.revoked_at === null &&
            (record.expires_at === null || record.expires_at > new Date()) &&
            record.students.is_active;
        if (!valid) {
            throw new common_1.NotFoundException('Invalid or expired access link');
        }
        await this.prisma.student_access_tokens.update({
            where: { id: record.id },
            data: { last_used_at: new Date() },
        });
        return record;
    }
};
exports.StudentAccessService = StudentAccessService;
exports.StudentAccessService = StudentAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentAccessService);
//# sourceMappingURL=student-access.service.js.map
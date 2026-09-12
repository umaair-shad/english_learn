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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const access_token_util_1 = require("../common/utils/access-token.util");
const prisma_service_1 = require("../database/prisma.service");
const SORT_FIELD_MAP = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    displayName: 'display_name',
    firstName: 'first_name',
};
let StudentsService = class StudentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const where = {};
        if (query.search) {
            const term = query.search.trim().toLowerCase();
            where.OR = [
                { first_name: { contains: term, mode: 'insensitive' } },
                { last_name: { contains: term, mode: 'insensitive' } },
                { display_name: { contains: term, mode: 'insensitive' } },
                { notes: { contains: term, mode: 'insensitive' } },
            ];
        }
        if (query.isActive !== undefined)
            where.is_active = query.isActive;
        const direction = query.order ?? 'desc';
        const sortKey = SORT_FIELD_MAP[query.sort] ?? 'created_at';
        const orderBy = {
            [sortKey]: direction,
        };
        const skip = (query.page - 1) * query.limit;
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.students.findMany({
                where,
                orderBy,
                skip,
                take: query.limit,
            }),
            this.prisma.students.count({ where }),
        ]);
        return {
            data: rows.map((row) => this.toStudentDto(row)),
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
            },
        };
    }
    async getById(id) {
        const student = await this.prisma.students.findUnique({
            where: { id: BigInt(id) },
            include: { student_access_tokens: true },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const active = student.student_access_tokens.find((t) => t.is_active && t.revoked_at === null);
        return {
            ...this.toStudentDto(student),
            accessToken: active
                ? {
                    id: Number(active.id),
                    prefix: active.token_prefix,
                    isActive: active.is_active,
                    expiresAt: active.expires_at?.toISOString() ?? null,
                    lastUsedAt: active.last_used_at?.toISOString() ?? null,
                }
                : null,
        };
    }
    async create(dto) {
        const student = await this.prisma.students.create({
            data: {
                first_name: dto.firstName,
                last_name: dto.lastName ?? null,
                display_name: dto.displayName,
                notes: dto.notes ?? null,
            },
        });
        return this.toStudentDto(student);
    }
    async update(id, dto) {
        const existing = await this.prisma.students.findUnique({
            where: { id: BigInt(id) },
        });
        if (!existing)
            throw new common_1.NotFoundException('Student not found');
        await this.prisma.students.update({
            where: { id: BigInt(id) },
            data: {
                first_name: dto.firstName,
                last_name: dto.lastName,
                display_name: dto.displayName,
                notes: dto.notes,
                is_active: dto.isActive,
                updated_at: new Date(),
            },
        });
        return this.getById(id);
    }
    async softDelete(id) {
        const existing = await this.prisma.students.findUnique({
            where: { id: BigInt(id) },
        });
        if (!existing)
            throw new common_1.NotFoundException('Student not found');
        await this.prisma.students.update({
            where: { id: BigInt(id) },
            data: { is_active: false, updated_at: new Date() },
        });
        await this.revokeActiveTokens(id);
    }
    async createAccessToken(studentId, options) {
        const student = await this.prisma.students.findUnique({
            where: { id: BigInt(studentId) },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        if (!student.is_active) {
            throw new common_1.BadRequestException('Student is deactivated');
        }
        await this.revokeActiveTokens(studentId);
        const { rawToken, tokenHash, tokenPrefix } = (0, access_token_util_1.generateAccessTokenPair)();
        const expiresAt = options?.expiresInSeconds === undefined
            ? null
            : new Date(Date.now() + options.expiresInSeconds * 1000);
        await this.prisma.student_access_tokens.create({
            data: {
                student_id: BigInt(studentId),
                token_hash: tokenHash,
                token_prefix: tokenPrefix,
                expires_at: expiresAt,
            },
        });
        return {
            studentId,
            rawToken,
            tokenPrefix,
            url: (0, access_token_util_1.accessTokenUrl)(rawToken),
            expiresAt: expiresAt?.toISOString() ?? null,
        };
    }
    async revokeAccessToken(studentId) {
        const student = await this.prisma.students.findUnique({
            where: { id: BigInt(studentId) },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        await this.revokeActiveTokens(studentId);
    }
    async revokeActiveTokens(studentId) {
        await this.prisma.student_access_tokens.updateMany({
            where: {
                student_id: BigInt(studentId),
                is_active: true,
                revoked_at: null,
            },
            data: { is_active: false, revoked_at: new Date() },
        });
    }
    toStudentDto(row) {
        return {
            id: Number(row.id),
            firstName: row.first_name,
            lastName: row.last_name,
            displayName: row.display_name,
            notes: row.notes,
            isActive: row.is_active,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
        };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map
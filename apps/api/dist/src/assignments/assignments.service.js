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
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const ASSIGNMENT_ITEM_SELECT = client_1.Prisma.sql `
SELECT
  s.id                                AS "senseId",
  e.id                                AS "entryId",
  e.lemma,
  e.normalized_lemma                  AS "normalizedLemma",
  e.part_of_speech                    AS "partOfSpeech",
  e.display_form                      AS "displayForm",
  s.position,
  s.definition,
  (SELECT array_agg(DISTINCT c.level ORDER BY c.level)
     FROM cefr_assignments c WHERE c.vocabulary_sense_id = s.id) AS "cefrLevels",
  f.rank                              AS "frequencyRank",
  st.status                           AS "learningStatus",
  st.review_count                     AS "reviewCount",
  st.next_review_at                   AS "nextReviewAt",
  ai.source_type                      AS "sourceType",
  ai.source_set_id                    AS "sourceSetId"
FROM assignment_items ai
JOIN vocabulary_senses s ON s.id = ai.vocabulary_sense_id
JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
LEFT JOIN student_vocabulary_states st
  ON st.vocabulary_sense_id = ai.vocabulary_sense_id
LEFT JOIN LATERAL (
  SELECT MIN(fd.rank) AS rank FROM frequency_data fd WHERE fd.vocabulary_entry_id = e.id
) f ON TRUE
`;
let AssignmentsService = class AssignmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const where = {};
        if (query.studentId !== undefined) {
            where.student_id = BigInt(query.studentId);
        }
        if (query.status) {
            where.status = query.status;
        }
        const now = new Date();
        if (query.due === 'overdue') {
            where.due_at = { lt: now };
            where.status = { in: ['ASSIGNED', 'IN_PROGRESS'] };
        }
        if (query.due === 'upcoming') {
            where.due_at = { gte: now };
            where.status = { in: ['ASSIGNED', 'IN_PROGRESS'] };
        }
        if (query.search && query.search.trim().length > 0) {
            where.OR = [
                { title: { contains: query.search.trim(), mode: 'insensitive' } },
                { description: { contains: query.search.trim(), mode: 'insensitive' } },
            ];
        }
        const [rows, total] = await Promise.all([
            this.prisma.assignments.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: {
                    students: {
                        select: {
                            id: true,
                            display_name: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    _count: { select: { assignment_items: true } },
                },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.assignments.count({ where }),
        ]);
        const ids = rows.map((r) => r.id);
        const progress = await this.loadProgress(ids);
        return {
            data: rows.map((row) => {
                const p = progress.get(row.id);
                const itemCount = row._count.assignment_items;
                const masteredCount = Number(p?.mastered ?? 0);
                return {
                    id: Number(row.id),
                    studentId: Number(row.student_id),
                    title: row.title,
                    description: row.description,
                    status: row.status,
                    assignedAt: row.assigned_at?.toISOString() ?? null,
                    dueAt: row.due_at?.toISOString() ?? null,
                    completedAt: row.completed_at?.toISOString() ?? null,
                    createdAt: row.created_at.toISOString(),
                    student: {
                        id: Number(row.students.id),
                        displayName: row.students.display_name,
                        firstName: row.students.first_name,
                        lastName: row.students.last_name,
                    },
                    itemCount,
                    masteredCount,
                    progress: itemCount === 0 ? 0 : Math.round((masteredCount / itemCount) * 100),
                };
            }),
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
            },
        };
    }
    async create(teacherId, dto) {
        const id = await this.prisma.$transaction(async (tx) => {
            const student = await tx.students.findUnique({
                where: { id: BigInt(dto.studentId) },
            });
            if (!student) {
                throw new common_1.NotFoundException(`Student ${dto.studentId} does not exist`);
            }
            if (!student.is_active) {
                throw new common_1.BadRequestException('Cannot assign vocabulary to a deactivated student');
            }
            const manualIds = dto.senseIds ?? [];
            await this.requireExistingSenseIds(tx, manualIds);
            const sourceIds = dto.vocabularySetIds ?? [];
            const setSenseRows = await this.loadSetSenseRows(tx, sourceIds);
            const items = new Map();
            for (const senseId of manualIds) {
                items.set(senseId, { sourceType: 'MANUAL', sourceSetId: null });
            }
            for (const row of setSenseRows) {
                const senseId = Number(row.senseId);
                if (!items.has(senseId)) {
                    items.set(senseId, {
                        sourceType: 'VOCABULARY_SET',
                        sourceSetId: row.setId,
                    });
                }
            }
            if (items.size === 0) {
                throw new common_1.BadRequestException('Assignment must contain at least one vocabulary sense');
            }
            const assignment = await tx.assignments.create({
                data: {
                    student_id: BigInt(dto.studentId),
                    title: dto.title,
                    description: dto.description ?? null,
                    status: 'ASSIGNED',
                    assigned_at: new Date(),
                    due_at: dto.dueAt ? new Date(dto.dueAt) : null,
                    created_by_teacher_id: BigInt(teacherId),
                },
            });
            await tx.assignment_items.createMany({
                data: [...items.entries()].map(([senseId, meta]) => ({
                    assignment_id: assignment.id,
                    vocabulary_sense_id: BigInt(senseId),
                    source_type: meta.sourceType,
                    source_set_id: meta.sourceSetId,
                })),
                skipDuplicates: true,
            });
            await tx.student_vocabulary_states.createMany({
                data: [...items.keys()].map((senseId) => ({
                    student_id: BigInt(dto.studentId),
                    vocabulary_sense_id: BigInt(senseId),
                })),
                skipDuplicates: true,
            });
            return Number(assignment.id);
        });
        return this.getById(id);
    }
    async getById(id) {
        const assignment = await this.prisma.assignments.findUnique({
            where: { id: BigInt(id) },
            include: {
                students: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                        is_active: true,
                    },
                },
            },
        });
        if (!assignment) {
            throw new common_1.NotFoundException(`Assignment ${id} not found`);
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      ${ASSIGNMENT_ITEM_SELECT}
      WHERE ai.assignment_id = ${id}
        AND (st.student_id IS NULL OR st.student_id = ${assignment.student_id})
      ORDER BY ai.id ASC
    `);
        const [translations, categories] = await Promise.all([
            this.loadTranslations(rows.map((r) => r.senseId)),
            this.loadCategories(rows.map((r) => r.senseId)),
        ]);
        const countByStatus = new Map();
        for (const row of rows) {
            if (row.learningStatus) {
                countByStatus.set(row.learningStatus, (countByStatus.get(row.learningStatus) ?? 0) + 1);
            }
        }
        const mastered = countByStatus.get('MASTERED') ?? 0;
        const totalItems = rows.length;
        return {
            id: Number(assignment.id),
            studentId: Number(assignment.student_id),
            title: assignment.title,
            description: assignment.description,
            status: assignment.status,
            assignedAt: assignment.assigned_at?.toISOString() ?? null,
            dueAt: assignment.due_at?.toISOString() ?? null,
            completedAt: assignment.completed_at?.toISOString() ?? null,
            createdAt: assignment.created_at.toISOString(),
            student: {
                id: Number(assignment.students.id),
                displayName: assignment.students.display_name,
                firstName: assignment.students.first_name,
                lastName: assignment.students.last_name,
                isActive: assignment.students.is_active,
            },
            totalItems,
            progress: {
                total: totalItems,
                mastered,
                percent: totalItems === 0
                    ? 0
                    : Math.round((mastered / totalItems) * 1000) / 10,
                countByStatus: {
                    assigned: countByStatus.get('ASSIGNED') ?? 0,
                    encountered: countByStatus.get('ENCOUNTERED') ?? 0,
                    learning: countByStatus.get('LEARNING') ?? 0,
                    reviewing: countByStatus.get('REVIEWING') ?? 0,
                    mastered,
                },
            },
            items: rows.map((row) => ({
                senseId: Number(row.senseId),
                entryId: Number(row.entryId),
                lemma: row.lemma,
                normalizedLemma: row.normalizedLemma,
                partOfSpeech: row.partOfSpeech,
                displayForm: row.displayForm,
                position: row.position,
                definition: row.definition,
                cefrLevels: row.cefrLevels ?? [],
                frequencyRank: row.frequencyRank === null ? null : Number(row.frequencyRank),
                translations: translations.get(row.senseId)?.map((t) => ({
                    id: Number(t.id),
                    text: t.text,
                    senseLabel: t.senseLabel,
                    matchMethod: t.matchMethod,
                    matchConfidence: t.matchConfidence,
                })) ?? [],
                categories: categories
                    .get(row.senseId)
                    ?.map((c) => ({ code: c.code, name: c.name })) ?? [],
                source: {
                    type: row.sourceType,
                    sourceSetId: row.sourceSetId === null ? null : Number(row.sourceSetId),
                },
                learning: row.learningStatus ?? null,
                reviewCount: row.reviewCount ?? 0,
                nextReviewAt: row.nextReviewAt?.toISOString() ?? null,
            })),
        };
    }
    async update(id, dto) {
        const existing = await this.prisma.assignments.findUnique({
            where: { id: BigInt(id) },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Assignment ${id} not found`);
        }
        if (existing.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Cannot update a cancelled assignment');
        }
        const data = { updated_at: new Date() };
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.dueAt !== undefined)
            data.due_at = new Date(dto.dueAt);
        if (dto.status !== undefined) {
            data.status = dto.status;
            if (dto.status === 'COMPLETED' && existing.completed_at === null) {
                data.completed_at = new Date();
            }
            else if (dto.status !== 'COMPLETED' && existing.completed_at !== null) {
                data.completed_at = null;
            }
            if (dto.status !== 'DRAFT' && existing.assigned_at === null) {
                data.assigned_at = new Date();
            }
        }
        await this.prisma.assignments.update({
            where: { id: BigInt(id) },
            data,
        });
        return this.getById(id);
    }
    async remove(id) {
        const existing = await this.prisma.assignments.findUnique({
            where: { id: BigInt(id) },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Assignment ${id} not found`);
        }
        await this.prisma.assignments.update({
            where: { id: BigInt(id) },
            data: {
                status: 'CANCELLED',
                completed_at: null,
                updated_at: new Date(),
            },
        });
        return { id, cancelled: true };
    }
    async belongsToStudent(id, studentId) {
        const record = await this.prisma.assignments.findFirst({
            where: {
                id: BigInt(id),
                student_id: BigInt(studentId),
                status: { notIn: ['DRAFT', 'CANCELLED'] },
            },
            select: { id: true },
        });
        return record !== null;
    }
    async listForStudent(studentId) {
        const rows = await this.prisma.assignments.findMany({
            where: {
                student_id: BigInt(studentId),
                status: { notIn: ['DRAFT', 'CANCELLED'] },
            },
            orderBy: { created_at: 'desc' },
            include: { _count: { select: { assignment_items: true } } },
        });
        const progress = await this.loadProgress(rows.map((r) => r.id));
        return rows.map((row) => {
            const itemCount = row._count.assignment_items;
            const masteredCount = Number(progress.get(row.id)?.mastered ?? 0);
            return {
                id: Number(row.id),
                title: row.title,
                description: row.description,
                status: row.status,
                dueAt: row.due_at?.toISOString() ?? null,
                assignedAt: row.assigned_at?.toISOString() ?? null,
                completedAt: row.completed_at?.toISOString() ?? null,
                createdAt: row.created_at.toISOString(),
                itemCount,
                masteredCount,
                progress: itemCount === 0 ? 0 : Math.round((masteredCount / itemCount) * 100),
            };
        });
    }
    async requireExistingSenseIds(tx, senseIds) {
        if (senseIds.length === 0)
            return;
        const existing = await tx.$queryRaw(client_1.Prisma.sql `SELECT id FROM vocabulary_senses WHERE id IN (${client_1.Prisma.join(senseIds)})`);
        const found = new Set(existing.map((r) => Number(r.id)));
        const missing = senseIds.filter((id) => !found.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Invalid vocabulary sense ids: ${missing.join(', ')}`);
        }
    }
    async loadSetSenseRows(tx, setIds) {
        if (setIds.length === 0)
            return [];
        const sets = await tx.vocabulary_sets.findMany({
            where: { id: { in: setIds.map((id) => BigInt(id)) } },
            select: { id: true, is_active: true },
        });
        const byId = new Map(sets.map((s) => [Number(s.id), s.is_active]));
        const missing = setIds.filter((id) => !byId.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Invalid vocabulary set ids: ${missing.join(', ')}`);
        }
        const inactive = setIds.filter((id) => !byId.get(id));
        if (inactive.length > 0) {
            throw new common_1.BadRequestException(`Deactivated vocabulary sets cannot be assigned: ${inactive.join(', ')}`);
        }
        return tx.$queryRaw(client_1.Prisma.sql `SELECT vocabulary_set_id AS "setId", vocabulary_sense_id AS "senseId"
        FROM vocabulary_set_items
        WHERE vocabulary_set_id IN (${client_1.Prisma.join(setIds.map((id) => BigInt(id)))})`);
    }
    async loadProgress(assignmentIds) {
        if (assignmentIds.length === 0)
            return new Map();
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT
          ai.assignment_id AS "assignmentId",
          count(*) AS total,
          count(*) FILTER (WHERE st.status = 'MASTERED') AS mastered
        FROM assignment_items ai
        JOIN assignments a ON a.id = ai.assignment_id
        LEFT JOIN student_vocabulary_states st
          ON st.student_id = a.student_id
         AND st.vocabulary_sense_id = ai.vocabulary_sense_id
        WHERE ai.assignment_id IN (${client_1.Prisma.join(assignmentIds)})
        GROUP BY ai.assignment_id`);
        return new Map(rows.map((r) => [
            r.assignmentId,
            { total: Number(r.total), mastered: Number(r.mastered) },
        ]));
    }
    async loadTranslations(senseIds) {
        if (senseIds.length === 0)
            return new Map();
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT
          vocabulary_sense_id AS "vocabularySenseId",
          id, text, sense_label AS "senseLabel",
          match_method AS "matchMethod", match_confidence AS "matchConfidence"
        FROM translations
        WHERE vocabulary_sense_id IN (${client_1.Prisma.join(senseIds)}) AND language = 'pl'
        ORDER BY vocabulary_sense_id, id`);
        return this.groupBy(rows);
    }
    async loadCategories(senseIds) {
        if (senseIds.length === 0)
            return new Map();
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT
          vca.vocabulary_sense_id AS "vocabularySenseId",
          c.code, c.name
        FROM vocabulary_category_assignments vca
        JOIN categories c ON c.id = vca.category_id
        WHERE vca.vocabulary_sense_id IN (${client_1.Prisma.join(senseIds)})
        ORDER BY vca.vocabulary_sense_id, c.code`);
        return this.groupBy(rows);
    }
    groupBy(rows) {
        const grouped = new Map();
        for (const row of rows) {
            const list = grouped.get(row.vocabularySenseId) ?? [];
            list.push(row);
            grouped.set(row.vocabularySenseId, list);
        }
        return grouped;
    }
};
exports.AssignmentsService = AssignmentsService;
exports.AssignmentsService = AssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map
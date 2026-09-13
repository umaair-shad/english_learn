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
exports.VocabularySetsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const page_meta_1 = require("../common/utils/page-meta");
const prisma_service_1 = require("../database/prisma.service");
const SET_SENSE_SELECT = client_1.Prisma.sql `
SELECT
  s.id                              AS "senseId",
  e.id                              AS "entryId",
  e.lemma,
  e.normalized_lemma                AS "normalizedLemma",
  e.part_of_speech                  AS "partOfSpeech",
  e.display_form                    AS "displayForm",
  s.position,
  s.definition,
  (SELECT array_agg(DISTINCT c.level ORDER BY c.level)
     FROM cefr_assignments c WHERE c.vocabulary_sense_id = s.id) AS "cefrLevels",
  f.rank                            AS "frequencyRank"
FROM vocabulary_set_items vsi
JOIN vocabulary_senses s ON s.id = vsi.vocabulary_sense_id
JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
LEFT JOIN LATERAL (
  SELECT MIN(fd.rank) AS rank FROM frequency_data fd WHERE fd.vocabulary_entry_id = e.id
) f ON TRUE
`;
let VocabularySetsService = class VocabularySetsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const clauses = [client_1.Prisma.sql `TRUE`];
        if (query.search && query.search.trim().length > 0) {
            const pattern = `%${query.search.trim()}%`;
            clauses.push(client_1.Prisma.sql `(vs.name ILIKE ${pattern} OR vs.description ILIKE ${pattern})`);
        }
        if (query.isActive !== undefined) {
            clauses.push(client_1.Prisma.sql `vs.is_active = ${query.isActive}`);
        }
        const where = client_1.Prisma.join(clauses, ' AND ');
        const direction = query.order === 'desc' ? 'DESC' : 'ASC';
        const orderBy = {
            name: client_1.Prisma.sql `ORDER BY vs.name ${client_1.Prisma.raw(direction)}, vs.id DESC`,
            createdAt: client_1.Prisma.sql `ORDER BY vs.created_at ${client_1.Prisma.raw(direction)}, vs.id DESC`,
            id: client_1.Prisma.sql `ORDER BY vs.id ${client_1.Prisma.raw(direction)}`,
        };
        const [rows, counted] = await Promise.all([
            this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT vs.id AS "setId", vs.name, vs.description, vs.is_active AS "isActive",
               count(vsi.id) AS "itemCount",
               vs.created_at AS "createdAt", vs.updated_at AS "updatedAt"
        FROM vocabulary_sets vs
        LEFT JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = vs.id
        WHERE ${where}
        GROUP BY vs.id
        ${orderBy[query.sort]}
        LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
      `),
            this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT count(*) AS total FROM vocabulary_sets vs WHERE ${where}
      `),
        ]);
        const total = Number(counted[0]?.total ?? 0);
        return {
            data: rows.map((r) => ({
                id: Number(r.setId),
                name: r.name,
                description: r.description,
                isActive: r.isActive,
                itemCount: Number(r.itemCount),
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            })),
            meta: (0, page_meta_1.pageMeta)(query.page, query.limit, total),
        };
    }
    async create(teacherId, dto) {
        const senseIds = await this.requireExistingSenseIdsCoro(dto.senseIds ?? []);
        return this.prisma.$transaction(async (tx) => {
            const set = await tx.vocabulary_sets.create({
                data: {
                    name: dto.name,
                    description: dto.description ?? null,
                    created_by_teacher_id: BigInt(teacherId),
                },
            });
            await this.insertItems(tx, set.id, senseIds, 0);
            return { id: Number(set.id) };
        });
    }
    async getById(id) {
        const set = await this.prisma.vocabulary_sets.findUnique({
            where: { id: BigInt(id) },
        });
        if (!set)
            throw new common_1.NotFoundException(`Vocabulary set ${id} not found`);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      ${SET_SENSE_SELECT}
      WHERE vsi.vocabulary_set_id = ${id}
      ORDER BY vsi.position ASC NULLS LAST, vsi.id ASC
    `);
        const [translations, categories] = await Promise.all([
            this.loadTranslations(rows.map((r) => r.senseId)),
            this.loadCategories(rows.map((r) => r.senseId)),
        ]);
        return {
            id: Number(set.id),
            name: set.name,
            description: set.description,
            isActive: set.is_active,
            itemCount: rows.length,
            createdAt: set.created_at.toISOString(),
            updatedAt: set.updated_at.toISOString(),
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
            })),
        };
    }
    async update(id, dto) {
        const existing = await this.prisma.vocabulary_sets.findUnique({
            where: { id: BigInt(id) },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Vocabulary set ${id} not found`);
        await this.prisma.vocabulary_sets.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name ?? existing.name,
                description: dto.description !== undefined
                    ? dto.description
                    : existing.description,
                is_active: dto.isActive ?? existing.is_active,
                updated_at: new Date(),
            },
        });
        return { id };
    }
    async remove(id) {
        const existing = await this.prisma.vocabulary_sets.findUnique({
            where: { id: BigInt(id) },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Vocabulary set ${id} not found`);
        await this.prisma.vocabulary_sets.update({
            where: { id: BigInt(id) },
            data: { is_active: false, updated_at: new Date() },
        });
        return { id, deactivated: true };
    }
    async addItems(id, dto) {
        const set = await this.prisma.vocabulary_sets.findUnique({
            where: { id: BigInt(id) },
        });
        if (!set)
            throw new common_1.NotFoundException(`Vocabulary set ${id} not found`);
        if (!set.is_active) {
            throw new common_1.BadRequestException('Cannot modify a deactivated vocabulary set');
        }
        const senseIds = await this.requireExistingSenseIdsCoro(dto.senseIds);
        await this.prisma.$transaction(async (tx) => {
            const maxPos = await tx.$queryRaw(client_1.Prisma.sql `SELECT max(position) AS m FROM vocabulary_set_items WHERE vocabulary_set_id = ${id}`);
            const start = maxPos[0]?.m === null ? 0 : Number(maxPos[0]?.m) + 1;
            await this.insertItems(tx, BigInt(id), senseIds, start);
        });
        return { itemCount: senseIds.length };
    }
    async removeItem(id, senseId) {
        const result = await this.prisma.vocabulary_set_items.deleteMany({
            where: {
                vocabulary_set_id: BigInt(id),
                vocabulary_sense_id: BigInt(senseId),
            },
        });
        if (result.count === 0) {
            throw new common_1.NotFoundException(`Sense ${senseId} is not in vocabulary set ${id}`);
        }
        const remaining = await this.prisma.vocabulary_set_items.count({
            where: { vocabulary_set_id: BigInt(id) },
        });
        return { itemCount: remaining };
    }
    async requireExistingSenseIdsCoro(senseIds) {
        if (senseIds.length === 0)
            return [];
        const existing = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT array_agg(r.id) AS ids FROM (
          SELECT id FROM vocabulary_senses WHERE id IN (${client_1.Prisma.join(senseIds)})
        ) r`);
        const found = new Set((existing[0]?.ids ?? []).map((n) => Number(n)));
        const missing = senseIds.filter((id) => !found.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Invalid vocabulary sense ids: ${missing.join(', ')}`);
        }
        return senseIds;
    }
    insertItems(tx, setId, senseIds, startPosition) {
        if (senseIds.length === 0)
            return Promise.resolve();
        return tx.vocabulary_set_items.createMany({
            data: senseIds.map((senseId, i) => ({
                vocabulary_set_id: setId,
                vocabulary_sense_id: BigInt(senseId),
                position: startPosition + i,
            })),
            skipDuplicates: true,
        });
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
exports.VocabularySetsService = VocabularySetsService;
exports.VocabularySetsService = VocabularySetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VocabularySetsService);
//# sourceMappingURL=vocabulary-sets.service.js.map
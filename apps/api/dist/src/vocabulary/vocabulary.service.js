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
exports.VocabularyService = void 0;
exports.buildWhereSql = buildWhereSql;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const page_meta_1 = require("../common/utils/page-meta");
const prisma_service_1 = require("../database/prisma.service");
const vocabulary_query_dto_1 = require("./dto/vocabulary-query.dto");
const SENSE_SELECT = client_1.Prisma.sql `
  SELECT
    s.id                              AS "senseId",
    e.id                              AS "entryId",
    e.lemma,
    e.normalized_lemma                AS "normalizedLemma",
    e.part_of_speech                  AS "partOfSpeech",
    e.display_form                    AS "displayForm",
    e.wikidata_qid                    AS "entryWikidataQid",
    s.position,
    s.definition,
    s.tags,
    s.sense_id_hint                   AS "senseIdHint",
    s.wikidata_qid                    AS "senseWikidataQid",
    f.rank                            AS "frequencyRank",
    (SELECT array_agg(DISTINCT c.level ORDER BY c.level)
       FROM cefr_assignments c
      WHERE c.vocabulary_sense_id = s.id) AS "cefrLevels"
  FROM vocabulary_senses s
  JOIN vocabulary_entries e ON e.id = s.vocabulary_entry_id
  LEFT JOIN LATERAL (
    SELECT MIN(fd.rank) AS rank
      FROM frequency_data fd
     WHERE fd.vocabulary_entry_id = e.id
  ) f ON TRUE`;
function buildWhereSql(dto) {
    const clauses = [client_1.Prisma.sql `TRUE`];
    if (dto.partOfSpeech) {
        clauses.push(client_1.Prisma.sql `e.part_of_speech = ${dto.partOfSpeech}`);
    }
    if (dto.cefr) {
        clauses.push(client_1.Prisma.sql `EXISTS (
      SELECT 1 FROM cefr_assignments c
      WHERE c.vocabulary_sense_id = s.id AND c.level = ${dto.cefr}
    )`);
    }
    if (dto.category && dto.category.trim().length > 0) {
        const pattern = `%${dto.category.trim()}%`;
        clauses.push(client_1.Prisma.sql `(
      EXISTS (
        SELECT 1 FROM sense_topics st
        WHERE st.vocabulary_sense_id = s.id
          AND st.topic ILIKE ${pattern}
      )
      OR EXISTS (
        SELECT 1 FROM vocabulary_category_assignments vca
        JOIN categories cat ON cat.id = vca.category_id
        WHERE vca.vocabulary_sense_id = s.id
          AND (cat.code ILIKE ${pattern} OR cat.name ILIKE ${pattern})
          AND cat.name !~* '^(basics|people|places|actions|things|problems|skills|events) [1-4]$'
      )
    )`);
    }
    if (dto.hasPolishTranslation !== undefined) {
        clauses.push(dto.hasPolishTranslation
            ? client_1.Prisma.sql `EXISTS (SELECT 1 FROM translations t WHERE t.vocabulary_sense_id = s.id AND t.language = 'pl')`
            : client_1.Prisma.sql `NOT EXISTS (SELECT 1 FROM translations t WHERE t.vocabulary_sense_id = s.id AND t.language = 'pl')`);
    }
    if (dto.lexicalOnly) {
        clauses.push(client_1.Prisma.sql `
      e.normalized_lemma ~ '[a-z]'
      AND e.normalized_lemma !~ '^[0-9]'
      AND e.part_of_speech NOT IN ('symbol', 'numeral')
      AND char_length(regexp_replace(e.normalized_lemma, '[^a-z]', '', 'g')) >= 2
    `);
    }
    if (dto.frequencyRank !== undefined) {
        clauses.push(client_1.Prisma.sql `EXISTS (
      SELECT 1 FROM frequency_data fd
      WHERE fd.vocabulary_entry_id = e.id AND fd.rank <= ${dto.frequencyRank}
    )`);
    }
    if (dto.search && dto.search.trim().length > 0) {
        const pattern = `%${dto.search.trim()}%`;
        clauses.push(client_1.Prisma.sql `(
      e.normalized_lemma ILIKE ${pattern}
      OR s.normalized_definition ILIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM translations t
        WHERE t.vocabulary_sense_id = s.id
          AND t.normalized_text ILIKE ${pattern}
      )
      OR EXISTS (
        SELECT 1 FROM sense_topics st
        WHERE st.vocabulary_sense_id = s.id
          AND st.topic ILIKE ${pattern}
      )
      OR EXISTS (
        SELECT 1 FROM vocabulary_category_assignments vca
        JOIN categories cat ON cat.id = vca.category_id
        WHERE vca.vocabulary_sense_id = s.id
          AND (cat.code ILIKE ${pattern} OR cat.name ILIKE ${pattern})
          AND cat.name !~* '^(basics|people|places|actions|things|problems|skills|events) [1-4]$'
      )
    )`);
    }
    return client_1.Prisma.sql `${SENSE_SELECT} WHERE ${client_1.Prisma.join(clauses, ' AND ')}`;
}
function orderBySql(sort, order) {
    const direction = order === 'desc' ? 'DESC' : 'ASC';
    switch (sort) {
        case 'lemma':
            return client_1.Prisma.sql `ORDER BY e.normalized_lemma ${client_1.Prisma.raw(direction)}, s.position ASC`;
        case 'frequency':
            return client_1.Prisma.sql `ORDER BY f.rank ${client_1.Prisma.raw(direction)} NULLS LAST, s.position ASC`;
        case 'position':
            return client_1.Prisma.sql `ORDER BY s.position ${client_1.Prisma.raw(direction)}`;
        case 'id':
        default:
            return client_1.Prisma.sql `ORDER BY s.id ${client_1.Prisma.raw(direction)}`;
    }
}
function buildPageSql(dto) {
    const offset = (dto.page - 1) * dto.limit;
    return client_1.Prisma.sql `${buildWhereSql(dto)}
   ${orderBySql(dto.sort, dto.order)}
   LIMIT ${dto.limit} OFFSET ${offset}`;
}
let VocabularyService = class VocabularyService {
    client;
    constructor(client) {
        this.client = client;
    }
    async list(dto) {
        const [rows, counted] = await Promise.all([
            this.client.$queryRaw(buildPageSql(dto)),
            this.client.$queryRaw `SELECT count(*) AS total FROM (${buildWhereSql(dto)}) AS base`,
        ]);
        const translations = await this.loadTranslations(rows);
        const data = rows.map((row) => ({
            id: Number(row.senseId),
            entryId: Number(row.entryId),
            lemma: row.lemma,
            normalizedLemma: row.normalizedLemma,
            partOfSpeech: row.partOfSpeech,
            displayForm: row.displayForm,
            position: row.position,
            definition: row.definition,
            tags: row.tags ?? [],
            senseIdHint: row.senseIdHint,
            translations: translations.get(row.senseId) ?? [],
            cefrLevels: row.cefrLevels ?? [],
            frequencyRank: row.frequencyRank === null ? null : Number(row.frequencyRank),
        }));
        const total = Number(counted[0]?.total ?? 0);
        return {
            data,
            meta: (0, page_meta_1.pageMeta)(dto.page, dto.limit, total),
        };
    }
    async listIds(dto) {
        const cap = Math.min(dto.limit, 200);
        const rows = await this.client.$queryRaw(client_1.Prisma.sql `${buildWhereSql(dto)}
        ${orderBySql(dto.sort, dto.order)}
        LIMIT ${cap}`);
        const counted = await this.client.$queryRaw `
      SELECT count(*) AS total FROM (${buildWhereSql(dto)}) AS base
    `;
        return {
            senseIds: rows.map((r) => Number(r.senseId)),
            total: Number(counted[0]?.total ?? 0),
        };
    }
    async search(dto) {
        const listDto = new vocabulary_query_dto_1.ListVocabularyDto();
        listDto.page = dto.page;
        listDto.limit = dto.limit;
        listDto.search = dto.q;
        listDto.sort = 'lemma';
        listDto.lexicalOnly = true;
        return this.list(listDto);
    }
    async listCategories() {
        const placeholder = /^(basics|people|places|actions|things|problems|skills|events) [1-4]$/i;
        const generatedChild = /_(BASICS|PEOPLE|PLACES|ACTIONS|THINGS|PROBLEMS|SKILLS|EVENTS)(_[1-4])?$/;
        const rows = await this.client.categories.findMany({
            orderBy: [{ parent_id: 'asc' }, { name: 'asc' }],
            select: { id: true, code: true, name: true, parent_id: true },
        });
        return rows
            .filter((r) => !placeholder.test(r.name.trim()) && !generatedChild.test(r.code))
            .map((r) => ({
            id: Number(r.id),
            code: r.code,
            name: r.name,
            parentId: r.parent_id === null ? null : Number(r.parent_id),
        }));
    }
    async detail(id) {
        const entry = await this.client.vocabulary_entries.findUnique({
            where: { id: BigInt(id) },
            include: {
                frequency_data: true,
                vocabulary_senses: {
                    orderBy: { position: 'asc' },
                    include: {
                        translations: {
                            where: { language: 'pl' },
                            orderBy: { id: 'asc' },
                        },
                        example_sentences: { orderBy: { id: 'asc' } },
                        cefr_assignments: {
                            include: {
                                vocabulary_sources: { select: { name: true } },
                            },
                        },
                        sense_synsets: {
                            include: {
                                wordnet_synsets: {
                                    select: {
                                        synset_id: true,
                                        definition: true,
                                        members: true,
                                    },
                                },
                            },
                        },
                        vocabulary_category_assignments: {
                            include: {
                                categories: { select: { code: true, name: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Vocabulary entry ${id} not found`);
        }
        const senseIds = entry.vocabulary_senses.map((s) => s.id);
        const topicRows = senseIds.length === 0
            ? []
            : await this.client.$queryRaw `
            SELECT vocabulary_sense_id, topic
            FROM sense_topics
            WHERE vocabulary_sense_id IN (${client_1.Prisma.join(senseIds)})
          `;
        const topicsBySense = new Map();
        for (const row of topicRows) {
            const key = String(row.vocabulary_sense_id);
            const list = topicsBySense.get(key) ?? [];
            list.push({ code: row.topic, name: row.topic });
            topicsBySense.set(key, list);
        }
        return {
            id: Number(entry.id),
            lemma: entry.lemma,
            normalizedLemma: entry.normalized_lemma,
            partOfSpeech: entry.part_of_speech,
            language: entry.language,
            displayForm: entry.display_form,
            wikidataQid: entry.wikidata_qid,
            createdAt: entry.created_at.toISOString(),
            updatedAt: entry.updated_at.toISOString(),
            frequency: entry.frequency_data.map((f) => ({
                rank: f.rank === null ? null : Number(f.rank),
                sfi: f.sfi === null ? null : Number(f.sfi),
                frequencyPerMillion: f.frequency_per_million === null
                    ? null
                    : Number(f.frequency_per_million),
            })),
            senses: entry.vocabulary_senses.map((s) => ({
                id: Number(s.id),
                position: s.position,
                lemma: s.lemma,
                normalizedLemma: s.normalized_lemma,
                partOfSpeech: s.part_of_speech,
                definition: s.definition,
                tags: s.tags ?? [],
                senseIdHint: s.sense_id_hint,
                wikidataQid: s.wikidata_qid,
                translations: s.translations.map((t) => ({
                    id: Number(t.id),
                    text: t.text,
                    senseLabel: t.sense_label,
                    matchMethod: t.match_method,
                    matchConfidence: t.match_confidence,
                })),
                examples: s.example_sentences.map((x) => ({
                    id: Number(x.id),
                    text: x.text,
                    source: x.source,
                    verification: x.verification,
                })),
                cefr: s.cefr_assignments.map((c) => ({
                    level: c.level,
                    confidence: c.confidence,
                    requiresReview: c.requires_review,
                    source: c.vocabulary_sources?.name ?? null,
                })),
                wordnet: s.sense_synsets.map((w) => ({
                    synsetId: w.wordnet_synsets.synset_id,
                    definition: w.wordnet_synsets.definition,
                    members: w.wordnet_synsets.members ?? [],
                    confidence: w.confidence,
                    score: w.score === null ? null : Number(w.score),
                })),
                categories: [
                    ...s.vocabulary_category_assignments
                        .map((a) => a.categories)
                        .filter((c) => c &&
                        !/^(basics|people|places|actions|things|problems|skills|events) [1-4]$/i.test(c.name)),
                    ...(topicsBySense.get(String(s.id)) ?? []),
                ],
            })),
        };
    }
    async loadTranslations(rows) {
        if (rows.length === 0) {
            return new Map();
        }
        const ids = rows.map((r) => r.senseId);
        const results = await this.client.$queryRaw(client_1.Prisma.sql `SELECT
          vocabulary_sense_id AS "vocabularySenseId",
          id,
          text,
          language,
          sense_label AS "senseLabel",
          match_method AS "matchMethod",
          match_confidence AS "matchConfidence"
        FROM translations
        WHERE vocabulary_sense_id IN (${client_1.Prisma.join(ids)})
          AND language = 'pl'
        ORDER BY vocabulary_sense_id, id`);
        const grouped = new Map();
        for (const row of results) {
            const list = grouped.get(row.vocabularySenseId) ?? [];
            list.push({
                id: Number(row.id),
                text: row.text,
                senseLabel: row.senseLabel,
                matchMethod: row.matchMethod,
                matchConfidence: row.matchConfidence,
            });
            grouped.set(row.vocabularySenseId, list);
        }
        return grouped;
    }
};
exports.VocabularyService = VocabularyService;
exports.VocabularyService = VocabularyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VocabularyService);
//# sourceMappingURL=vocabulary.service.js.map
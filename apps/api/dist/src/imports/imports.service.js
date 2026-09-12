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
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
let ImportsService = class ImportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async importVocabulary(_teacherId, dto) {
        const rawRows = dto.format === 'csv'
            ? this.parseCsv(dto.content ?? '')
            : dto.format === 'xlsx'
                ? await this.parseXlsx(dto.content ?? '')
                : (dto.rows ?? []);
        if (rawRows.length === 0) {
            throw new common_1.BadRequestException('Import contained no rows');
        }
        const errors = [];
        const rows = [];
        for (const [index, row] of rawRows.entries()) {
            const rowNumber = index + 1;
            const reason = this.validateRow(row);
            if (reason) {
                errors.push({ row: rowNumber, reason });
            }
            else {
                rows.push({ ...row, rowNumber });
            }
        }
        if (dto.dryRun || rows.length === 0) {
            const existing = [];
            if (dto.dryRun) {
                for (const row of rows) {
                    existing.push(await this.lookupExisting({
                        lemma: row.lemma,
                        partOfSpeech: row.partOfSpeech,
                        definition: row.definition,
                    }));
                }
            }
            return {
                dryRun: dto.dryRun === true,
                totalRows: rawRows.length,
                validated: rows.length,
                created: existing.filter((r) => r.created).length,
                skippedExisting: existing.filter((r) => !r.created).length,
                errors,
                rows: existing,
            };
        }
        const output = await this.prisma.$transaction(async (tx) => {
            const result = [];
            let created = 0;
            let skippedExisting = 0;
            for (const row of rows) {
                try {
                    const outcome = await this.createSenseIfNew(tx, row);
                    result.push(outcome);
                    if (outcome.created)
                        created += 1;
                    else
                        skippedExisting += 1;
                }
                catch (err) {
                    errors.push({
                        row: row.rowNumber,
                        reason: this.safeDbReason(err),
                    });
                    result.push({
                        row: row.rowNumber,
                        senseId: 0,
                        created: false,
                    });
                }
            }
            return { result, created, skippedExisting };
        });
        return {
            dryRun: false,
            totalRows: rawRows.length,
            validated: rows.length,
            created: output.created,
            skippedExisting: output.skippedExisting,
            errors,
            rows: output.result,
        };
    }
    async lookupExisting(row) {
        const normalizedLemma = this.normalize(row.lemma);
        const normalizedDefinition = this.normalize(row.definition);
        const sense = await this.prisma.vocabulary_senses.findFirst({
            where: {
                normalized_definition: normalizedDefinition,
                vocabulary_entries: {
                    normalized_lemma: normalizedLemma,
                    part_of_speech: row.partOfSpeech.trim(),
                },
            },
            select: { id: true },
        });
        return {
            row: 0,
            senseId: sense ? Number(sense.id) : 0,
            created: sense === null,
        };
    }
    async createSenseIfNew(tx, row) {
        const lemma = row.lemma.trim();
        const partOfSpeech = row.partOfSpeech.trim();
        const definition = row.definition.trim();
        const normalizedLemma = this.normalize(lemma);
        const normalizedDefinition = this.normalize(definition);
        const entry = (await tx.vocabulary_entries.findFirst({
            where: {
                normalized_lemma: normalizedLemma,
                part_of_speech: partOfSpeech,
            },
        })) ??
            (await tx.vocabulary_entries.create({
                data: {
                    lemma,
                    normalized_lemma: normalizedLemma,
                    part_of_speech: partOfSpeech,
                    language: 'en',
                },
            }));
        const existingSense = await tx.vocabulary_senses.findFirst({
            where: {
                vocabulary_entry_id: entry.id,
                normalized_definition: normalizedDefinition,
            },
            select: { id: true },
        });
        if (existingSense) {
            return {
                row: row.rowNumber,
                senseId: Number(existingSense.id),
                created: false,
            };
        }
        const maxPos = await tx.vocabulary_senses.aggregate({
            where: { vocabulary_entry_id: entry.id },
            _max: { position: true },
        });
        const tags = [
            ...new Set([
                ...(row.tags ?? []).map((t) => t.trim()).filter(Boolean),
                'teacher-import',
            ]),
        ];
        const sense = await tx.vocabulary_senses.create({
            data: {
                vocabulary_entry_id: entry.id,
                position: (maxPos._max.position ?? 0) + 1,
                lemma,
                normalized_lemma: normalizedLemma,
                part_of_speech: partOfSpeech,
                definition,
                normalized_definition: normalizedDefinition,
                raw_definition: definition,
                tags,
                sense_id_hint: row.senseIdHint?.trim() || null,
            },
        });
        for (const text of this.toList(row.translations)) {
            const trimmed = text.trim();
            if (!trimmed)
                continue;
            await this.insertTranslation(tx, Number(sense.id), trimmed);
        }
        for (const text of this.toList(row.examples)) {
            const trimmed = text.trim();
            if (!trimmed)
                continue;
            await this.insertExample(tx, Number(sense.id), trimmed);
        }
        return { row: row.rowNumber, senseId: Number(sense.id), created: true };
    }
    async insertTranslation(tx, senseId, text) {
        try {
            await tx.translations.create({
                data: {
                    vocabulary_sense_id: BigInt(senseId),
                    language: 'pl',
                    text,
                    normalized_text: this.normalize(text),
                    match_method: 'teacher',
                },
            });
        }
        catch (err) {
            if (!this.isUniqueViolation(err))
                throw err;
        }
    }
    async insertExample(tx, senseId, text) {
        try {
            await tx.example_sentences.create({
                data: {
                    vocabulary_sense_id: BigInt(senseId),
                    text,
                    source: 'teacher',
                },
            });
        }
        catch (err) {
            if (!this.isUniqueViolation(err))
                throw err;
        }
    }
    validateRow(row) {
        if (!row.lemma || row.lemma.trim().length === 0) {
            return 'missing lemma';
        }
        if (!row.partOfSpeech || row.partOfSpeech.trim().length === 0) {
            return 'missing partOfSpeech';
        }
        if (!row.definition || row.definition.trim().length === 0) {
            return 'missing definition';
        }
        return null;
    }
    toList(value) {
        if (value === undefined)
            return [];
        if (Array.isArray(value))
            return value;
        return value
            .split(/[;\n\r]+/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    normalize(value) {
        return value.trim().toLowerCase();
    }
    safeDbReason(err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return `database error: ${err.code}`;
        }
        return `database error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
    isUniqueViolation(err) {
        return (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002');
    }
    async parseXlsx(content) {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const buffer = Buffer.from(content.replace(/^data:.*,/, ''), 'base64');
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet)
            return [];
        const headerRow = sheet.getRow(1);
        const headers = [];
        headerRow.eachCell((cell, col) => {
            headers[col] = String(cell.value ?? '')
                .trim()
                .toLowerCase();
        });
        const rows = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1)
                return;
            const get = (name) => {
                const col = headers.findIndex((h) => h === name);
                if (col < 1)
                    return '';
                const value = row.getCell(col).value;
                return value === null || value === undefined ? '' : String(value);
            };
            const lemma = get('lemma') || get('english') || get('word');
            const definition = get('definition');
            if (!lemma || !definition)
                return;
            rows.push({
                lemma,
                partOfSpeech: get('partofspeech') || get('pos') || 'unknown',
                definition,
                translations: get('translations') || get('polishtranslations') || get('polish'),
                examples: get('examples'),
                cefrLevels: get('cefrlevels') || get('cefr'),
                tags: get('tags')
                    ? get('tags')
                        .split(/[;,]/)
                        .map((t) => t.trim())
                        .filter(Boolean)
                    : undefined,
            });
        });
        return rows;
    }
    parseCsv(content) {
        const rows = [];
        let field = '';
        let row = [];
        let inQuotes = false;
        let i = 0;
        const text = content.replace(/^\uFEFF/, '');
        while (i < text.length) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (text[i + 1] === '"') {
                        field += '"';
                        i += 2;
                        continue;
                    }
                    inQuotes = false;
                    i += 1;
                    continue;
                }
                field += char;
                i += 1;
                continue;
            }
            if (char === '"') {
                inQuotes = true;
                i += 1;
                continue;
            }
            if (char === ',') {
                row.push(field);
                field = '';
                i += 1;
                continue;
            }
            if (char === '\r' || char === '\n') {
                row.push(field);
                field = '';
                if (row.some((cell) => cell.trim().length > 0))
                    rows.push(row);
                row = [];
                if (char === '\r' && text[i + 1] === '\n')
                    i += 1;
                i += 1;
                continue;
            }
            field += char;
            i += 1;
        }
        row.push(field);
        if (row.some((cell) => cell.trim().length > 0))
            rows.push(row);
        if (rows.length === 0)
            return [];
        const header = rows[0].map((h) => this.headerKey(h));
        return rows.slice(1).map((values) => {
            const obj = {};
            header.forEach((key, index) => {
                const value = values[index]?.trim() ?? '';
                if (key === 'translations' || key === 'examples') {
                    obj[key] = value ? this.toList(value) : [];
                }
                else if (key === 'cefrLevels') {
                    obj[key] = value
                        ? value
                            .split(/[,;\n\r]+/)
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : [];
                }
                else if (key === 'tags') {
                    obj[key] = value
                        ? value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                        : [];
                }
                else {
                    obj[key] = value;
                }
            });
            return obj;
        });
    }
    headerKey(value) {
        const normalized = value
            .trim()
            .toLowerCase()
            .replace(/[^a-z_]/g, '');
        switch (normalized) {
            case 'lemma':
                return 'lemma';
            case 'partofspeech':
            case 'part_of_speech':
            case 'pos':
                return 'partOfSpeech';
            case 'definition':
            case 'meaning':
                return 'definition';
            case 'translations':
            case 'translation':
            case 'polish':
            case 'polish_translations':
                return 'translations';
            case 'examples':
            case 'example':
            case 'example_sentences':
                return 'examples';
            case 'cefrlevels':
            case 'cefr_levels':
            case 'cefr':
                return 'cefrLevels';
            case 'tags':
            case 'senseidhint':
            case 'sense_id_hint':
            case 'hint':
                return 'senseIdHint';
            default:
                return normalized;
        }
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map
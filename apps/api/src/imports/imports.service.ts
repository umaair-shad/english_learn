import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ImportResult,
  ImportResultRow,
  ImportVocabularyDto,
  ImportVocabularyRow,
  ParseError,
} from './imports.dto';

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async importVocabulary(
    _teacherId: number,
    dto: ImportVocabularyDto,
  ): Promise<ImportResult> {
    const rawRows =
      dto.format === 'csv'
        ? this.parseCsv(dto.content ?? '')
        : dto.format === 'xlsx'
          ? await this.parseXlsx(dto.content ?? '')
          : (dto.rows ?? []);
    if (rawRows.length === 0) {
      throw new BadRequestException('Import contained no rows');
    }

    const errors: ParseError[] = [];
    const rows: Array<ImportVocabularyRow & { rowNumber: number }> = [];
    for (const [index, row] of rawRows.entries()) {
      const rowNumber = index + 1;
      const reason = this.validateRow(row);
      if (reason) {
        errors.push({ row: rowNumber, reason });
      } else {
        rows.push({ ...row, rowNumber });
      }
    }

    if (dto.dryRun || rows.length === 0) {
      const existing: ImportResultRow[] = [];
      if (dto.dryRun) {
        for (const row of rows) {
          existing.push(
            await this.lookupExisting({
              lemma: row.lemma,
              partOfSpeech: row.partOfSpeech,
              definition: row.definition,
            }),
          );
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
      const result: ImportResultRow[] = [];
      let created = 0;
      let skippedExisting = 0;
      for (const row of rows) {
        try {
          const outcome = await this.createSenseIfNew(tx, row);
          result.push(outcome);
          if (outcome.created) created += 1;
          else skippedExisting += 1;
        } catch (err) {
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

  // ---------------------------------------------------------------- private

  private async lookupExisting(row: {
    lemma: string;
    partOfSpeech: string;
    definition: string;
  }): Promise<ImportResultRow> {
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

  private async createSenseIfNew(
    tx: Prisma.TransactionClient,
    row: ImportVocabularyRow & { rowNumber: number },
  ): Promise<ImportResultRow> {
    const lemma = row.lemma.trim();
    const partOfSpeech = row.partOfSpeech.trim();
    const definition = row.definition.trim();
    const normalizedLemma = this.normalize(lemma);
    const normalizedDefinition = this.normalize(definition);

    const entry =
      (await tx.vocabulary_entries.findFirst({
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
      if (!trimmed) continue;
      await this.insertTranslation(tx, Number(sense.id), trimmed);
    }
    for (const text of this.toList(row.examples)) {
      const trimmed = text.trim();
      if (!trimmed) continue;
      await this.insertExample(tx, Number(sense.id), trimmed);
    }

    return { row: row.rowNumber, senseId: Number(sense.id), created: true };
  }

  private async insertTranslation(
    tx: Prisma.TransactionClient,
    senseId: number,
    text: string,
  ): Promise<void> {
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
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
    }
  }

  private async insertExample(
    tx: Prisma.TransactionClient,
    senseId: number,
    text: string,
  ): Promise<void> {
    try {
      await tx.example_sentences.create({
        data: {
          vocabulary_sense_id: BigInt(senseId),
          text,
          source: 'teacher',
        },
      });
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
    }
  }

  private validateRow(row: ImportVocabularyRow): string | null {
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

  private toList(value: string | string[] | undefined): string[] {
    if (value === undefined) return [];
    if (Array.isArray(value)) return value;
    return value
      .split(/[;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  private safeDbReason(err: unknown): string {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return `database error: ${err.code}`;
    }
    return `database error: ${err instanceof Error ? err.message : 'unknown'}`;
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    );
  }

  /** Minimal RFC4180-style parser (quoted fields, embedded commas/newlines). */
  private async parseXlsx(content: string): Promise<ImportVocabularyRow[]> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(content.replace(/^data:.*,/, ''), 'base64');
    // exceljs types expect Node 18 Buffer; Node 22 Buffer is generic Buffer<ArrayBuffer>.
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, col) => {
      headers[col] = String(cell.value ?? '')
        .trim()
        .toLowerCase();
    });
    const rows: ImportVocabularyRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const get = (name: string): string => {
        const col = headers.findIndex((h) => h === name);
        if (col < 1) return '';
        const value = row.getCell(col).value;
        return value === null || value === undefined ? '' : String(value);
      };
      const lemma = get('lemma') || get('english') || get('word');
      const definition = get('definition');
      if (!lemma || !definition) return;
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

  private parseCsv(content: string): ImportVocabularyRow[] {
    const rows: string[][] = [];
    let field = '';
    let row: string[] = [];
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
        if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
        row = [];
        if (char === '\r' && text[i + 1] === '\n') i += 1;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
    }
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
    if (rows.length === 0) return [];

    const header = rows[0].map((h) => this.headerKey(h));
    return rows.slice(1).map((values) => {
      const obj: Record<string, string | string[]> = {};
      header.forEach((key, index) => {
        const value = values[index]?.trim() ?? '';
        if (key === 'translations' || key === 'examples') {
          obj[key] = value ? this.toList(value) : [];
        } else if (key === 'cefrLevels') {
          obj[key] = value
            ? value
                .split(/[,;\n\r]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        } else if (key === 'tags') {
          obj[key] = value
            ? value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [];
        } else {
          obj[key] = value;
        }
      });
      return obj as unknown as ImportVocabularyRow;
    });
  }

  private headerKey(value: string): string {
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
}

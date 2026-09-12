import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateVocabularySetDto,
  SetItemsDto,
  SetQueryDto,
  SetSort,
  UpdateVocabularySetDto,
} from './dto/vocabulary-sets.dto';

interface SetListItem {
  setId: bigint;
  name: string;
  description: string | null;
  isActive: boolean;
  itemCount: bigint;
  createdAt: Date;
  updatedAt: Date;
}

interface SetSenseRow {
  senseId: bigint;
  entryId: bigint;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  cefrLevels: string[];
  frequencyRank: number | null;
}

export interface TranslationRow {
  vocabularySenseId: bigint;
  id: bigint;
  text: string;
  senseLabel: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
}

export interface CategoryRow {
  vocabularySenseId: bigint;
  code: string;
  name: string;
}

const SET_SENSE_SELECT = Prisma.sql`
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

@Injectable()
export class VocabularySetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SetQueryDto): Promise<{
    data: Array<{
      id: number;
      name: string;
      description: string | null;
      isActive: boolean;
      itemCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.search && query.search.trim().length > 0) {
      const pattern = `%${query.search.trim()}%`;
      clauses.push(
        Prisma.sql`(vs.name ILIKE ${pattern} OR vs.description ILIKE ${pattern})`,
      );
    }
    if (query.isActive !== undefined) {
      clauses.push(Prisma.sql`vs.is_active = ${query.isActive}`);
    }
    const where = Prisma.join(clauses, ' AND ');

    const direction: 'ASC' | 'DESC' = query.order === 'desc' ? 'DESC' : 'ASC';
    const orderBy: Record<SetSort, Prisma.Sql> = {
      name: Prisma.sql`ORDER BY vs.name ${Prisma.raw(direction)}, vs.id DESC`,
      createdAt: Prisma.sql`ORDER BY vs.created_at ${Prisma.raw(direction)}, vs.id DESC`,
      id: Prisma.sql`ORDER BY vs.id ${Prisma.raw(direction)}`,
    };

    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<SetListItem[]>(Prisma.sql`
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
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
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
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async create(
    teacherId: number,
    dto: CreateVocabularySetDto,
  ): Promise<{ id: number }> {
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

  async getById(id: number): Promise<{
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      senseId: number;
      entryId: number;
      lemma: string;
      normalizedLemma: string;
      partOfSpeech: string;
      displayForm: string | null;
      position: number;
      definition: string;
      cefrLevels: string[];
      frequencyRank: number | null;
      translations: Array<{
        id: number;
        text: string;
        senseLabel: string | null;
        matchMethod: string | null;
        matchConfidence: string | null;
      }>;
      categories: Array<{ code: string; name: string }>;
    }>;
  }> {
    const set = await this.prisma.vocabulary_sets.findUnique({
      where: { id: BigInt(id) },
    });
    if (!set) throw new NotFoundException(`Vocabulary set ${id} not found`);

    const rows = await this.prisma.$queryRaw<SetSenseRow[]>(Prisma.sql`
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
        frequencyRank:
          row.frequencyRank === null ? null : Number(row.frequencyRank),
        translations:
          translations.get(row.senseId)?.map((t) => ({
            id: Number(t.id),
            text: t.text,
            senseLabel: t.senseLabel,
            matchMethod: t.matchMethod,
            matchConfidence: t.matchConfidence,
          })) ?? [],
        categories:
          categories
            .get(row.senseId)
            ?.map((c) => ({ code: c.code, name: c.name })) ?? [],
      })),
    };
  }

  async update(
    id: number,
    dto: UpdateVocabularySetDto,
  ): Promise<{ id: number }> {
    const existing = await this.prisma.vocabulary_sets.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing)
      throw new NotFoundException(`Vocabulary set ${id} not found`);

    await this.prisma.vocabulary_sets.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name ?? existing.name,
        description:
          dto.description !== undefined
            ? dto.description
            : existing.description,
        is_active: dto.isActive ?? existing.is_active,
        updated_at: new Date(),
      },
    });
    return { id };
  }

  /** Soft-disable per the milestone preference. */
  async remove(id: number): Promise<{ id: number; deactivated: boolean }> {
    const existing = await this.prisma.vocabulary_sets.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing)
      throw new NotFoundException(`Vocabulary set ${id} not found`);
    await this.prisma.vocabulary_sets.update({
      where: { id: BigInt(id) },
      data: { is_active: false, updated_at: new Date() },
    });
    return { id, deactivated: true };
  }

  async addItems(id: number, dto: SetItemsDto): Promise<{ itemCount: number }> {
    const set = await this.prisma.vocabulary_sets.findUnique({
      where: { id: BigInt(id) },
    });
    if (!set) throw new NotFoundException(`Vocabulary set ${id} not found`);
    if (!set.is_active) {
      throw new BadRequestException(
        'Cannot modify a deactivated vocabulary set',
      );
    }
    const senseIds = await this.requireExistingSenseIdsCoro(dto.senseIds);
    await this.prisma.$transaction(async (tx) => {
      const maxPos = await tx.$queryRaw<Array<{ m: bigint | null }>>(
        Prisma.sql`SELECT max(position) AS m FROM vocabulary_set_items WHERE vocabulary_set_id = ${id}`,
      );
      const start = maxPos[0]?.m === null ? 0 : Number(maxPos[0]?.m) + 1;
      await this.insertItems(tx, BigInt(id), senseIds, start);
    });
    return { itemCount: senseIds.length };
  }

  async removeItem(
    id: number,
    senseId: number,
  ): Promise<{ itemCount: number }> {
    const result = await this.prisma.vocabulary_set_items.deleteMany({
      where: {
        vocabulary_set_id: BigInt(id),
        vocabulary_sense_id: BigInt(senseId),
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `Sense ${senseId} is not in vocabulary set ${id}`,
      );
    }
    const remaining = await this.prisma.vocabulary_set_items.count({
      where: { vocabulary_set_id: BigInt(id) },
    });
    return { itemCount: remaining };
  }

  // -------------------------------------------------------------- private

  /** Ensures every senseId exists. Returns the ordered, deduplicated ids. */
  private async requireExistingSenseIdsCoro(
    senseIds: number[],
  ): Promise<number[]> {
    if (senseIds.length === 0) return [];
    const existing = await this.prisma.$queryRaw<Array<{ ids: unknown }>>(
      Prisma.sql`SELECT array_agg(r.id) AS ids FROM (
          SELECT id FROM vocabulary_senses WHERE id IN (${Prisma.join(senseIds)})
        ) r`,
    );
    const found = new Set<number>(
      ((existing[0]?.ids as number[]) ?? []).map((n) => Number(n)),
    );
    const missing = senseIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Invalid vocabulary sense ids: ${missing.join(', ')}`,
      );
    }
    return senseIds;
  }

  private insertItems(
    tx: Prisma.TransactionClient,
    setId: bigint,
    senseIds: number[],
    startPosition: number,
  ) {
    if (senseIds.length === 0) return Promise.resolve();
    return tx.vocabulary_set_items.createMany({
      data: senseIds.map((senseId, i) => ({
        vocabulary_set_id: setId,
        vocabulary_sense_id: BigInt(senseId),
        position: startPosition + i,
      })),
      skipDuplicates: true,
    });
  }

  private async loadTranslations(
    senseIds: bigint[],
  ): Promise<Map<bigint, TranslationRow[]>> {
    if (senseIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<TranslationRow[]>(
      Prisma.sql`SELECT
          vocabulary_sense_id AS "vocabularySenseId",
          id, text, sense_label AS "senseLabel",
          match_method AS "matchMethod", match_confidence AS "matchConfidence"
        FROM translations
        WHERE vocabulary_sense_id IN (${Prisma.join(senseIds)}) AND language = 'pl'
        ORDER BY vocabulary_sense_id, id`,
    );
    return this.groupBy<TranslationRow>(rows);
  }

  private async loadCategories(
    senseIds: bigint[],
  ): Promise<Map<bigint, CategoryRow[]>> {
    if (senseIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<CategoryRow[]>(
      Prisma.sql`SELECT
          vca.vocabulary_sense_id AS "vocabularySenseId",
          c.code, c.name
        FROM vocabulary_category_assignments vca
        JOIN categories c ON c.id = vca.category_id
        WHERE vca.vocabulary_sense_id IN (${Prisma.join(senseIds)})
        ORDER BY vca.vocabulary_sense_id, c.code`,
    );
    return this.groupBy<CategoryRow>(rows);
  }

  private groupBy<T extends { vocabularySenseId: bigint }>(
    rows: T[],
  ): Map<bigint, T[]> {
    const grouped = new Map<bigint, T[]>();
    for (const row of rows) {
      const list = grouped.get(row.vocabularySenseId) ?? [];
      list.push(row);
      grouped.set(row.vocabularySenseId, list);
    }
    return grouped;
  }
}

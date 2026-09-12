import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  generateAccessTokenPair,
  accessTokenUrl,
} from '../common/utils/access-token.util';
import { PrismaService } from '../database/prisma.service';
import {
  AccessTokenOptionsDto,
  CreateStudentDto,
  StudentQueryDto,
  UpdateStudentDto,
} from './dto/students.dto';

export interface StudentDto {
  id: number;
  firstName: string;
  lastName: string | null;
  displayName: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedStudents {
  data: StudentDto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StudentAccessTokenDto {
  id: number;
  prefix: string;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface CreatedAccessToken {
  studentId: number;
  rawToken: string;
  tokenPrefix: string;
  url: string;
  expiresAt: string | null;
}

const SORT_FIELD_MAP: Record<
  string,
  keyof Prisma.studentsOrderByWithRelationInput
> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  displayName: 'display_name',
  firstName: 'first_name',
};

type StudentRow = Prisma.studentsGetPayload<Record<string, never>>;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StudentQueryDto): Promise<PaginatedStudents> {
    const where: Prisma.studentsWhereInput = {};
    if (query.search) {
      const term = query.search.trim().toLowerCase();
      where.OR = [
        { first_name: { contains: term, mode: 'insensitive' } },
        { last_name: { contains: term, mode: 'insensitive' } },
        { display_name: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.is_active = query.isActive;

    const direction = query.order ?? 'desc';
    const sortKey = SORT_FIELD_MAP[query.sort] ?? 'created_at';
    const orderBy: Prisma.studentsOrderByWithRelationInput = {
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

  async getById(
    id: number,
  ): Promise<StudentDto & { accessToken: StudentAccessTokenDto | null }> {
    const student = await this.prisma.students.findUnique({
      where: { id: BigInt(id) },
      include: { student_access_tokens: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const active = student.student_access_tokens.find(
      (t) => t.is_active && t.revoked_at === null,
    );
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

  async create(dto: CreateStudentDto): Promise<StudentDto> {
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

  async update(
    id: number,
    dto: UpdateStudentDto,
  ): Promise<StudentDto & { accessToken: StudentAccessTokenDto | null }> {
    const existing = await this.prisma.students.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) throw new NotFoundException('Student not found');

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

  async softDelete(id: number): Promise<void> {
    const existing = await this.prisma.students.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) throw new NotFoundException('Student not found');

    await this.prisma.students.update({
      where: { id: BigInt(id) },
      data: { is_active: false, updated_at: new Date() },
    });
    await this.revokeActiveTokens(id);
  }

  async createAccessToken(
    studentId: number,
    options?: AccessTokenOptionsDto,
  ): Promise<CreatedAccessToken> {
    const student = await this.prisma.students.findUnique({
      where: { id: BigInt(studentId) },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.is_active) {
      throw new BadRequestException('Student is deactivated');
    }

    await this.revokeActiveTokens(studentId);

    const { rawToken, tokenHash, tokenPrefix } = generateAccessTokenPair();
    const expiresAt =
      options?.expiresInSeconds === undefined
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
      url: accessTokenUrl(rawToken),
      expiresAt: expiresAt?.toISOString() ?? null,
    };
  }

  async revokeAccessToken(studentId: number): Promise<void> {
    const student = await this.prisma.students.findUnique({
      where: { id: BigInt(studentId) },
    });
    if (!student) throw new NotFoundException('Student not found');
    await this.revokeActiveTokens(studentId);
  }

  private async revokeActiveTokens(studentId: number): Promise<void> {
    await this.prisma.student_access_tokens.updateMany({
      where: {
        student_id: BigInt(studentId),
        is_active: true,
        revoked_at: null,
      },
      data: { is_active: false, revoked_at: new Date() },
    });
  }

  toStudentDto(row: StudentRow): StudentDto {
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
}

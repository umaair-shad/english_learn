import { PrismaService } from '../database/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { LearningExportDto, SessionsExportDto, VocabularyExportDto } from './exports.dto';
import { SerializedFile, ExportSerializer } from './serializer.service';
export declare class ExportsService {
    private readonly prisma;
    private readonly reports;
    private readonly serializer;
    constructor(prisma: PrismaService, reports: ReportsService, serializer: ExportSerializer);
    exportVocabulary(teacherId: number, query: VocabularyExportDto): Promise<SerializedFile>;
    exportStudents(teacherId: number, format: string): Promise<SerializedFile>;
    exportLearning(teacherId: number, query: LearningExportDto): Promise<SerializedFile>;
    exportAssignments(teacherId: number, format: string): Promise<SerializedFile>;
    exportSessions(teacherId: number, query: SessionsExportDto): Promise<SerializedFile>;
    private loadTranslations;
}

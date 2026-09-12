import { PrismaService } from '../database/prisma.service';
import { ImportResult, ImportVocabularyDto } from './imports.dto';
export declare class ImportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    importVocabulary(_teacherId: number, dto: ImportVocabularyDto): Promise<ImportResult>;
    private lookupExisting;
    private createSenseIfNew;
    private insertTranslation;
    private insertExample;
    private validateRow;
    private toList;
    private normalize;
    private safeDbReason;
    private isUniqueViolation;
    private parseXlsx;
    private parseCsv;
    private headerKey;
}

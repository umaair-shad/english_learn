import { ACTIVITY_TYPES } from '../activities/dto/activities.dto';
import type { CefrLevel } from '../vocabulary/dto/vocabulary-query.dto';
export declare const EXPORT_FORMATS: readonly ["csv", "json", "xlsx"];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
declare class ExportFormatDto {
    format: ExportFormat;
}
export declare class VocabularyExportDto extends ExportFormatDto {
    search?: string;
    partOfSpeech?: string;
    cefr?: CefrLevel;
    category?: string;
    hasPolishTranslation?: boolean;
    frequencyRank?: number;
}
export declare class StudentsExportDto extends ExportFormatDto {
}
export declare class LearningExportDto extends ExportFormatDto {
    studentId?: number;
}
export declare class AssignmentsExportDto extends ExportFormatDto {
}
export declare class SessionsExportDto extends ExportFormatDto {
    studentId?: number;
    activityType?: (typeof ACTIVITY_TYPES)[number];
    from?: string;
    to?: string;
}
export {};

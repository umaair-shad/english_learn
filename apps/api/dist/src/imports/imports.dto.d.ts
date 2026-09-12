export declare const IMPORT_FORMATS: readonly ["json", "csv", "xlsx"];
export type ImportFormat = (typeof IMPORT_FORMATS)[number];
export declare class ImportVocabularyRow {
    lemma: string;
    partOfSpeech: string;
    definition: string;
    translations?: string[] | string;
    examples?: string[] | string;
    cefrLevels?: string[] | string;
    tags?: string[];
    senseIdHint?: string;
}
export declare class ImportVocabularyDto {
    format: ImportFormat;
    rows?: ImportVocabularyRow[];
    content?: string;
    dryRun?: boolean;
}
export interface ParseError {
    row: number;
    reason: string;
}
export interface ImportResultRow {
    row: number;
    senseId: number;
    created: boolean;
}
export interface ImportResult {
    dryRun: boolean;
    totalRows: number;
    validated: number;
    created: number;
    skippedExisting: number;
    errors: ParseError[];
    rows: ImportResultRow[];
}

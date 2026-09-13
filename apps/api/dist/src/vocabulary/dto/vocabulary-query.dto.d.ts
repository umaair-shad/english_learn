export declare const CEFR_LEVELS: readonly ["A1", "A2", "B1", "B2", "C1", "C2"];
export type CefrLevel = (typeof CEFR_LEVELS)[number];
export declare const VOCABULARY_SORTS: readonly ["lemma", "position", "frequency", "id"];
export type VocabularySort = (typeof VOCABULARY_SORTS)[number];
export declare class ListVocabularyDto {
    page: number;
    limit: number;
    search?: string;
    partOfSpeech?: string;
    cefr?: CefrLevel;
    category?: string;
    hasPolishTranslation?: boolean;
    frequencyRank?: number;
    lexicalOnly?: boolean;
    sort: VocabularySort;
    order: 'asc' | 'desc';
}
export declare class SearchVocabularyDto {
    q: string;
    page: number;
    limit: number;
}

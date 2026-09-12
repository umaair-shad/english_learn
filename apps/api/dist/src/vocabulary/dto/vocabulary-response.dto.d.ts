export declare class PolishTranslation {
    id: number;
    text: string;
    senseLabel: string | null;
    matchMethod: string | null;
    matchConfidence: string | null;
}
export declare class VocabularyListItem {
    id: number;
    entryId: number;
    lemma: string;
    normalizedLemma: string;
    partOfSpeech: string;
    displayForm: string | null;
    position: number;
    definition: string;
    tags: string[];
    senseIdHint: string | null;
    translations: PolishTranslation[];
    cefrLevels: string[];
    frequencyRank: number | null;
}
export declare class VocabularyDetailEntry {
    id: number;
    lemma: string;
    normalizedLemma: string;
    partOfSpeech: string;
    language: string;
    displayForm: string | null;
    wikidataQid: string | null;
    createdAt: string;
    updatedAt: string;
    frequency: Array<{
        rank: number | null;
        sfi: number | null;
        frequencyPerMillion: number | null;
    }>;
    senses: VocabularyDetailSense[];
}
export declare class VocabularyDetailSense {
    id: number;
    position: number;
    lemma: string;
    normalizedLemma: string;
    partOfSpeech: string;
    definition: string;
    tags: string[];
    senseIdHint: string | null;
    wikidataQid: string | null;
    translations: PolishTranslation[];
    examples: Array<{
        id: number;
        text: string;
        source: string;
        verification: string | null;
    }>;
    cefr: Array<{
        level: string;
        confidence: string;
        requiresReview: boolean;
        source: string | null;
    }>;
    wordnet: Array<{
        synsetId: string;
        definition: string;
        members: string[];
        confidence: string;
        score: number | null;
    }>;
    categories: Array<{
        code: string;
        name: string;
    }>;
}
export interface PaginatedMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export declare class PaginatedList {
    data: VocabularyListItem[];
    meta: PaginatedMeta;
}

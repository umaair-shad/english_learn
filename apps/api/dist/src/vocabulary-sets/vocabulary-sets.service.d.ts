import { PrismaService } from '../database/prisma.service';
import { CreateVocabularySetDto, SetItemsDto, SetQueryDto, UpdateVocabularySetDto } from './dto/vocabulary-sets.dto';
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
export declare class VocabularySetsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: SetQueryDto): Promise<{
        data: Array<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            itemCount: number;
            createdAt: string;
            updatedAt: string;
        }>;
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    create(teacherId: number, dto: CreateVocabularySetDto): Promise<{
        id: number;
    }>;
    getById(id: number): Promise<{
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
            categories: Array<{
                code: string;
                name: string;
            }>;
        }>;
    }>;
    update(id: number, dto: UpdateVocabularySetDto): Promise<{
        id: number;
    }>;
    remove(id: number): Promise<{
        id: number;
        deactivated: boolean;
    }>;
    addItems(id: number, dto: SetItemsDto): Promise<{
        itemCount: number;
    }>;
    removeItem(id: number, senseId: number): Promise<{
        itemCount: number;
    }>;
    private requireExistingSenseIdsCoro;
    private insertItems;
    private loadTranslations;
    private loadCategories;
    private groupBy;
}

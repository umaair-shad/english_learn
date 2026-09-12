import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { CreateVocabularySetDto, SetItemsDto, SetQueryDto, UpdateVocabularySetDto } from './dto/vocabulary-sets.dto';
import { VocabularySetsService } from './vocabulary-sets.service';
export declare class VocabularySetsController {
    private readonly service;
    constructor(service: VocabularySetsService);
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
    create(req: AuthenticatedRequest, body: CreateVocabularySetDto): Promise<{
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
    update(id: number, body: UpdateVocabularySetDto): Promise<{
        id: number;
    }>;
    remove(id: number): Promise<{
        id: number;
        deactivated: boolean;
    }>;
    addItems(id: number, body: SetItemsDto): Promise<{
        itemCount: number;
    }>;
    removeItem(id: number, senseId: number): Promise<{
        itemCount: number;
    }>;
}

import { ListVocabularyDto, SearchVocabularyDto } from './dto/vocabulary-query.dto';
import { PaginatedList, VocabularyDetailEntry } from './dto/vocabulary-response.dto';
import { VocabularyService } from './vocabulary.service';
export declare class VocabularyController {
    private readonly service;
    constructor(service: VocabularyService);
    list(query: ListVocabularyDto): Promise<PaginatedList>;
    listCategories(): Promise<{
        id: number;
        code: string;
        name: string;
        parentId: number | null;
    }[]>;
    search(query: SearchVocabularyDto): Promise<PaginatedList>;
    listIds(query: ListVocabularyDto): Promise<{
        senseIds: number[];
        total: number;
    }>;
    detail(id: number): Promise<VocabularyDetailEntry>;
}

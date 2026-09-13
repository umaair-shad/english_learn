import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ListVocabularyDto, SearchVocabularyDto } from './dto/vocabulary-query.dto';
import { PaginatedList, VocabularyDetailEntry } from './dto/vocabulary-response.dto';
export declare function buildWhereSql(dto: Pick<ListVocabularyDto, 'search' | 'partOfSpeech' | 'cefr' | 'category' | 'hasPolishTranslation' | 'frequencyRank' | 'lexicalOnly'>): Prisma.Sql;
export declare class VocabularyService {
    private readonly client;
    constructor(client: PrismaService);
    list(dto: ListVocabularyDto): Promise<PaginatedList>;
    listIds(dto: ListVocabularyDto): Promise<{
        senseIds: number[];
        total: number;
    }>;
    search(dto: SearchVocabularyDto): Promise<PaginatedList>;
    listCategories(): Promise<Array<{
        id: number;
        code: string;
        name: string;
        parentId: number | null;
    }>>;
    detail(id: number): Promise<VocabularyDetailEntry>;
    private loadTranslations;
}

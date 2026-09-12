import { ImportVocabularyDto } from './imports.dto';
import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly service;
    constructor(service: ImportsService);
    importVocabulary(teacher: {
        teacherId: number;
    }, dto: ImportVocabularyDto): Promise<import("./imports.dto").ImportResult>;
}

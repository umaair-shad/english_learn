import { StreamableFile } from '@nestjs/common';
import { AssignmentsExportDto, LearningExportDto, SessionsExportDto, StudentsExportDto, VocabularyExportDto } from './exports.dto';
import { ExportsService } from './exports.service';
export declare class ExportsController {
    private readonly service;
    constructor(service: ExportsService);
    exportVocabulary(teacher: {
        teacherId: number;
    }, query: VocabularyExportDto): Promise<StreamableFile>;
    exportStudents(teacher: {
        teacherId: number;
    }, query: StudentsExportDto): Promise<StreamableFile>;
    exportLearning(teacher: {
        teacherId: number;
    }, query: LearningExportDto): Promise<StreamableFile>;
    exportAssignments(teacher: {
        teacherId: number;
    }, query: AssignmentsExportDto): Promise<StreamableFile>;
    exportSessions(teacher: {
        teacherId: number;
    }, query: SessionsExportDto): Promise<StreamableFile>;
    private toStream;
}

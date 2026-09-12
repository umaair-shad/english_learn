"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsExportDto = exports.AssignmentsExportDto = exports.LearningExportDto = exports.StudentsExportDto = exports.VocabularyExportDto = exports.EXPORT_FORMATS = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const activities_dto_1 = require("../activities/dto/activities.dto");
const vocabulary_query_dto_1 = require("../vocabulary/dto/vocabulary-query.dto");
exports.EXPORT_FORMATS = ['csv', 'json', 'xlsx'];
class ExportFormatDto {
    format = 'csv';
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(exports.EXPORT_FORMATS),
    __metadata("design:type", String)
], ExportFormatDto.prototype, "format", void 0);
class VocabularyExportDto extends ExportFormatDto {
    search;
    partOfSpeech;
    cefr;
    category;
    hasPolishTranslation;
    frequencyRank;
}
exports.VocabularyExportDto = VocabularyExportDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], VocabularyExportDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], VocabularyExportDto.prototype, "partOfSpeech", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(vocabulary_query_dto_1.CEFR_LEVELS),
    __metadata("design:type", String)
], VocabularyExportDto.prototype, "cefr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], VocabularyExportDto.prototype, "category", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], VocabularyExportDto.prototype, "hasPolishTranslation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value === undefined ? undefined : Number(value))),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], VocabularyExportDto.prototype, "frequencyRank", void 0);
class StudentsExportDto extends ExportFormatDto {
}
exports.StudentsExportDto = StudentsExportDto;
class LearningExportDto extends ExportFormatDto {
    studentId;
}
exports.LearningExportDto = LearningExportDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value === undefined ? undefined : Number(value))),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], LearningExportDto.prototype, "studentId", void 0);
class AssignmentsExportDto extends ExportFormatDto {
}
exports.AssignmentsExportDto = AssignmentsExportDto;
class SessionsExportDto extends ExportFormatDto {
    studentId;
    activityType;
    from;
    to;
}
exports.SessionsExportDto = SessionsExportDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value === undefined ? undefined : Number(value))),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SessionsExportDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(activities_dto_1.ACTIVITY_TYPES),
    __metadata("design:type", Object)
], SessionsExportDto.prototype, "activityType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], SessionsExportDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], SessionsExportDto.prototype, "to", void 0);
//# sourceMappingURL=exports.dto.js.map
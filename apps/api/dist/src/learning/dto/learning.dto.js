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
exports.DueReviewsQueryDto = exports.OverrideStateDto = exports.ReviewSenseDto = exports.AssignSenseDto = exports.StudentVocabularyQueryDto = exports.SOURCE_TYPES = exports.REVIEW_RATINGS = exports.LEARNING_STATUSES = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.LEARNING_STATUSES = [
    'ASSIGNED',
    'ENCOUNTERED',
    'LEARNING',
    'REVIEWING',
    'MASTERED',
];
exports.REVIEW_RATINGS = ['AGAIN', 'HARD', 'GOOD', 'EASY'];
exports.SOURCE_TYPES = ['manual', 'activity'];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
class StudentVocabularyQueryDto {
    status;
    cefr;
    partOfSpeech;
    due;
    search;
    page = 1;
    limit = 20;
}
exports.StudentVocabularyQueryDto = StudentVocabularyQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.LEARNING_STATUSES),
    __metadata("design:type", String)
], StudentVocabularyQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(CEFR_LEVELS),
    __metadata("design:type", Object)
], StudentVocabularyQueryDto.prototype, "cefr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], StudentVocabularyQueryDto.prototype, "partOfSpeech", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === '1' || value === true),
    __metadata("design:type", Boolean)
], StudentVocabularyQueryDto.prototype, "due", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], StudentVocabularyQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], StudentVocabularyQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    __metadata("design:type", Object)
], StudentVocabularyQueryDto.prototype, "limit", void 0);
class AssignSenseDto {
    sourceType;
}
exports.AssignSenseDto = AssignSenseDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], AssignSenseDto.prototype, "sourceType", void 0);
class ReviewSenseDto {
    rating;
    responseTimeMs;
    sourceType = 'manual';
    sourceId;
}
exports.ReviewSenseDto = ReviewSenseDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.REVIEW_RATINGS),
    __metadata("design:type", String)
], ReviewSenseDto.prototype, "rating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(3_600_000),
    __metadata("design:type", Number)
], ReviewSenseDto.prototype, "responseTimeMs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.SOURCE_TYPES),
    __metadata("design:type", String)
], ReviewSenseDto.prototype, "sourceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ReviewSenseDto.prototype, "sourceId", void 0);
class OverrideStateDto {
    status;
    forceDue;
}
exports.OverrideStateDto = OverrideStateDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.LEARNING_STATUSES),
    __metadata("design:type", String)
], OverrideStateDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], OverrideStateDto.prototype, "forceDue", void 0);
class DueReviewsQueryDto {
    page = 1;
    limit = 50;
}
exports.DueReviewsQueryDto = DueReviewsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], DueReviewsQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    __metadata("design:type", Object)
], DueReviewsQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=learning.dto.js.map
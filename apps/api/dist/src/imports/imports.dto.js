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
exports.ImportVocabularyDto = exports.ImportVocabularyRow = exports.IMPORT_FORMATS = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.IMPORT_FORMATS = ['json', 'csv', 'xlsx'];
class ImportVocabularyRow {
    lemma;
    partOfSpeech;
    definition;
    translations;
    examples;
    cefrLevels;
    tags;
    senseIdHint;
}
exports.ImportVocabularyRow = ImportVocabularyRow;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], ImportVocabularyRow.prototype, "lemma", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], ImportVocabularyRow.prototype, "partOfSpeech", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ImportVocabularyRow.prototype, "definition", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ImportVocabularyRow.prototype, "translations", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ImportVocabularyRow.prototype, "examples", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ImportVocabularyRow.prototype, "cefrLevels", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ImportVocabularyRow.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], ImportVocabularyRow.prototype, "senseIdHint", void 0);
class ImportVocabularyDto {
    format;
    rows;
    content;
    dryRun;
}
exports.ImportVocabularyDto = ImportVocabularyDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.IMPORT_FORMATS),
    __metadata("design:type", String)
], ImportVocabularyDto.prototype, "format", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(5000),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ImportVocabularyRow),
    __metadata("design:type", Array)
], ImportVocabularyDto.prototype, "rows", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2_000_000),
    __metadata("design:type", String)
], ImportVocabularyDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ImportVocabularyDto.prototype, "dryRun", void 0);
//# sourceMappingURL=imports.dto.js.map
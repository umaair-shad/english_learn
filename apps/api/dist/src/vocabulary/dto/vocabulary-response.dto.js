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
exports.PaginatedList = exports.VocabularyDetailSense = exports.VocabularyDetailEntry = exports.VocabularyListItem = exports.PolishTranslation = void 0;
const swagger_1 = require("@nestjs/swagger");
class PolishTranslation {
    id;
    text;
    senseLabel;
    matchMethod;
    matchConfidence;
}
exports.PolishTranslation = PolishTranslation;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PolishTranslation.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PolishTranslation.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], PolishTranslation.prototype, "senseLabel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], PolishTranslation.prototype, "matchMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], PolishTranslation.prototype, "matchConfidence", void 0);
class VocabularyListItem {
    id;
    entryId;
    lemma;
    normalizedLemma;
    partOfSpeech;
    displayForm;
    position;
    definition;
    tags;
    senseIdHint;
    translations;
    cefrLevels;
    frequencyRank;
}
exports.VocabularyListItem = VocabularyListItem;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VocabularyListItem.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VocabularyListItem.prototype, "entryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyListItem.prototype, "lemma", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyListItem.prototype, "normalizedLemma", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyListItem.prototype, "partOfSpeech", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], VocabularyListItem.prototype, "displayForm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sense position within the entry (0-based, stable ID)',
    }),
    __metadata("design:type", Number)
], VocabularyListItem.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyListItem.prototype, "definition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], VocabularyListItem.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], VocabularyListItem.prototype, "senseIdHint", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PolishTranslation] }),
    __metadata("design:type", Array)
], VocabularyListItem.prototype, "translations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        description: 'Distinct CEFR levels for the sense',
    }),
    __metadata("design:type", Array)
], VocabularyListItem.prototype, "cefrLevels", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: Number,
        required: false,
        description: 'NGSL frequency rank (lower is more frequent)',
    }),
    __metadata("design:type", Object)
], VocabularyListItem.prototype, "frequencyRank", void 0);
class VocabularyDetailEntry {
    id;
    lemma;
    normalizedLemma;
    partOfSpeech;
    language;
    displayForm;
    wikidataQid;
    createdAt;
    updatedAt;
    frequency;
    senses;
}
exports.VocabularyDetailEntry = VocabularyDetailEntry;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VocabularyDetailEntry.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailEntry.prototype, "lemma", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailEntry.prototype, "normalizedLemma", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailEntry.prototype, "partOfSpeech", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailEntry.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], VocabularyDetailEntry.prototype, "displayForm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], VocabularyDetailEntry.prototype, "wikidataQid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailEntry.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailEntry.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Object], description: 'NGSL/other frequency rows' }),
    __metadata("design:type", Array)
], VocabularyDetailEntry.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Object] }),
    __metadata("design:type", Array)
], VocabularyDetailEntry.prototype, "senses", void 0);
class VocabularyDetailSense {
    id;
    position;
    lemma;
    normalizedLemma;
    partOfSpeech;
    definition;
    tags;
    senseIdHint;
    wikidataQid;
    translations;
    examples;
    cefr;
    wordnet;
    categories;
}
exports.VocabularyDetailSense = VocabularyDetailSense;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VocabularyDetailSense.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VocabularyDetailSense.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailSense.prototype, "lemma", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailSense.prototype, "normalizedLemma", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailSense.prototype, "partOfSpeech", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VocabularyDetailSense.prototype, "definition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], VocabularyDetailSense.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], VocabularyDetailSense.prototype, "senseIdHint", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], VocabularyDetailSense.prototype, "wikidataQid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PolishTranslation] }),
    __metadata("design:type", Array)
], VocabularyDetailSense.prototype, "translations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Object], description: 'Example sentences' }),
    __metadata("design:type", Array)
], VocabularyDetailSense.prototype, "examples", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [Object],
        description: 'CEFR evidence with source attribution',
    }),
    __metadata("design:type", Array)
], VocabularyDetailSense.prototype, "cefr", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Object], description: 'WordNet synset matches' }),
    __metadata("design:type", Array)
], VocabularyDetailSense.prototype, "wordnet", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Object], description: 'Assigned categories' }),
    __metadata("design:type", Array)
], VocabularyDetailSense.prototype, "categories", void 0);
class PaginatedList {
    data;
    meta;
}
exports.PaginatedList = PaginatedList;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [VocabularyListItem] }),
    __metadata("design:type", Array)
], PaginatedList.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], PaginatedList.prototype, "meta", void 0);
//# sourceMappingURL=vocabulary-response.dto.js.map
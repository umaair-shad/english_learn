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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vocabulary_query_dto_1 = require("./dto/vocabulary-query.dto");
const vocabulary_service_1 = require("./vocabulary.service");
let VocabularyController = class VocabularyController {
    service;
    constructor(service) {
        this.service = service;
    }
    async list(query) {
        return this.service.list(query);
    }
    listCategories() {
        return this.service.listCategories();
    }
    async search(query) {
        return this.service.search(query);
    }
    async detail(id) {
        return this.service.detail(id);
    }
};
exports.VocabularyController = VocabularyController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search and paginate vocabulary senses' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        description: 'Matches lemma, Polish translation or definition',
    }),
    (0, swagger_1.ApiQuery)({ name: 'partOfSpeech', required: false, example: 'noun' }),
    (0, swagger_1.ApiQuery)({ name: 'cefr', required: false, enum: vocabulary_query_dto_1.CEFR_LEVELS }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        required: false,
        description: 'Match sense category code or name (partial, case-insensitive)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'hasPolishTranslation', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({
        name: 'frequencyRank',
        required: false,
        description: 'top-N rank filter',
    }),
    (0, swagger_1.ApiQuery)({ name: 'sort', required: false, enum: vocabulary_query_dto_1.VOCABULARY_SORTS }),
    (0, swagger_1.ApiQuery)({ name: 'order', required: false, enum: ['asc', 'desc'] }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vocabulary_query_dto_1.ListVocabularyDto]),
    __metadata("design:returntype", Promise)
], VocabularyController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'List vocabulary taxonomy categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search across lemma, Polish translation and definition',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'bank' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vocabulary_query_dto_1.SearchVocabularyDto]),
    __metadata("design:returntype", Promise)
], VocabularyController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Full entry detail: senses, Polish, examples, CEFR, freq, WordNet, categories',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], VocabularyController.prototype, "detail", null);
exports.VocabularyController = VocabularyController = __decorate([
    (0, swagger_1.ApiTags)('vocabulary'),
    (0, common_1.Controller)('vocabulary'),
    __metadata("design:paramtypes", [vocabulary_service_1.VocabularyService])
], VocabularyController);
//# sourceMappingURL=vocabulary.controller.js.map
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
exports.VocabularySetsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vocabulary_sets_dto_1 = require("./dto/vocabulary-sets.dto");
const vocabulary_sets_service_1 = require("./vocabulary-sets.service");
let VocabularySetsController = class VocabularySetsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query) {
        return this.service.list(query);
    }
    create(req, body) {
        return this.service.create(req.teacher.teacherId, body);
    }
    getById(id) {
        return this.service.getById(id);
    }
    update(id, body) {
        return this.service.update(id, body);
    }
    remove(id) {
        return this.service.remove(id);
    }
    addItems(id, body) {
        return this.service.addItems(id, body);
    }
    removeItem(id, senseId) {
        return this.service.removeItem(id, senseId);
    }
};
exports.VocabularySetsController = VocabularySetsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vocabulary_sets_dto_1.SetQueryDto]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, vocabulary_sets_dto_1.CreateVocabularySetDto]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, vocabulary_sets_dto_1.UpdateVocabularySetDto]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, vocabulary_sets_dto_1.SetItemsDto]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "addItems", null);
__decorate([
    (0, common_1.Delete)(':id/items/:senseId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Param)('senseId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], VocabularySetsController.prototype, "removeItem", null);
exports.VocabularySetsController = VocabularySetsController = __decorate([
    (0, swagger_1.ApiTags)('vocabulary-sets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('vocabulary-sets'),
    __metadata("design:paramtypes", [vocabulary_sets_service_1.VocabularySetsService])
], VocabularySetsController);
//# sourceMappingURL=vocabulary-sets.controller.js.map
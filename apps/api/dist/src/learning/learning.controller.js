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
exports.LearningController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const learning_dto_1 = require("./dto/learning.dto");
const learning_service_1 = require("./learning.service");
let LearningController = class LearningController {
    learning;
    constructor(learning) {
        this.learning = learning;
    }
    listVocabulary(studentId, query) {
        return this.learning.list(studentId, query);
    }
    due(studentId, query) {
        return this.learning.due(studentId, query);
    }
    summary(studentId) {
        return this.learning.summary(studentId);
    }
    distribution(studentId) {
        return this.learning.distribution(studentId);
    }
    senseDetail(studentId, senseId) {
        return this.learning.detail(studentId, senseId);
    }
    assign(studentId, senseId, body) {
        return this.learning.assign(studentId, senseId, body.sourceType ?? 'manual');
    }
    async review(studentId, senseId, body) {
        await this.learning.review(studentId, senseId, body);
        return this.learning.detail(studentId, senseId);
    }
    unassign(studentId, senseId) {
        return this.learning.unassign(studentId, senseId);
    }
    override(studentId, senseId, body) {
        return this.learning.override(studentId, senseId, body);
    }
};
exports.LearningController = LearningController;
__decorate([
    (0, common_1.Get)('vocabulary'),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, learning_dto_1.StudentVocabularyQueryDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "listVocabulary", null);
__decorate([
    (0, common_1.Get)('reviews/due'),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, learning_dto_1.DueReviewsQueryDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "due", null);
__decorate([
    (0, common_1.Get)('vocabulary/summary'),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('vocabulary/distribution'),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "distribution", null);
__decorate([
    (0, common_1.Get)('vocabulary/:senseId'),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Param)('senseId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "senseDetail", null);
__decorate([
    (0, common_1.Post)('vocabulary/:senseId/assign'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Param)('senseId', new common_1.ParseIntPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, learning_dto_1.AssignSenseDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)('vocabulary/:senseId/review'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Param)('senseId', new common_1.ParseIntPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, learning_dto_1.ReviewSenseDto]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "review", null);
__decorate([
    (0, common_1.Delete)('vocabulary/:senseId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Param)('senseId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "unassign", null);
__decorate([
    (0, common_1.Patch)('vocabulary/:senseId/state'),
    __param(0, (0, common_1.Param)('studentId', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Param)('senseId', new common_1.ParseIntPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, learning_dto_1.OverrideStateDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "override", null);
exports.LearningController = LearningController = __decorate([
    (0, swagger_1.ApiTags)('learning'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('students/:studentId'),
    __metadata("design:paramtypes", [learning_service_1.LearningService])
], LearningController);
//# sourceMappingURL=learning.controller.js.map
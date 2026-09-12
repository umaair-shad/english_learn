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
exports.ActivityLearningService = void 0;
const common_1 = require("@nestjs/common");
const learning_service_1 = require("../learning/learning.service");
const learning_dto_1 = require("../learning/dto/learning.dto");
let ActivityLearningService = class ActivityLearningService {
    learning;
    constructor(learning) {
        this.learning = learning;
    }
    async applyAnswerReview(tx, studentId, senseId, rating, responseTimeMs, activityId) {
        const dto = new learning_dto_1.ReviewSenseDto();
        dto.rating = rating;
        dto.responseTimeMs = responseTimeMs ?? undefined;
        dto.sourceType = 'activity';
        dto.sourceId = activityId;
        await this.learning.review(studentId, senseId, dto, tx);
    }
};
exports.ActivityLearningService = ActivityLearningService;
exports.ActivityLearningService = ActivityLearningService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [learning_service_1.LearningService])
], ActivityLearningService);
//# sourceMappingURL=activity-learning.service.js.map
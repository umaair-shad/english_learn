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
exports.StudentAccessController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const assignments_service_1 = require("../assignments/assignments.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
const learning_service_1 = require("../learning/learning.service");
const learning_dto_1 = require("../learning/dto/learning.dto");
const student_access_service_1 = require("./student-access.service");
let StudentAccessController = class StudentAccessController {
    access;
    learning;
    assignmentsService;
    constructor(access, learning, assignmentsService) {
        this.access = access;
        this.learning = learning;
        this.assignmentsService = assignmentsService;
    }
    resolve(token) {
        return this.access.resolve(token);
    }
    async summary(token) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.learning.summary(studentId);
    }
    async vocabulary(token, query) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.learning.list(studentId, query);
    }
    async due(token, query) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.learning.due(studentId, query);
    }
    async assignments(token) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.assignmentsService.listForStudent(studentId);
    }
    async assignment(token, assignmentId) {
        const studentId = await this.access.studentIdFromToken(token);
        if (!(await this.assignmentsService.belongsToStudent(assignmentId, studentId))) {
            throw new common_1.NotFoundException(`Assignment ${assignmentId} not found`);
        }
        return this.assignmentsService.getById(assignmentId);
    }
};
exports.StudentAccessController = StudentAccessController;
__decorate([
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentAccessController.prototype, "resolve", null);
__decorate([
    (0, common_1.Get)(':token/vocabulary/summary'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StudentAccessController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)(':token/vocabulary'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, learning_dto_1.StudentVocabularyQueryDto]),
    __metadata("design:returntype", Promise)
], StudentAccessController.prototype, "vocabulary", null);
__decorate([
    (0, common_1.Get)(':token/reviews/due'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, learning_dto_1.DueReviewsQueryDto]),
    __metadata("design:returntype", Promise)
], StudentAccessController.prototype, "due", null);
__decorate([
    (0, common_1.Get)(':token/assignments'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StudentAccessController.prototype, "assignments", null);
__decorate([
    (0, common_1.Get)(':token/assignments/:assignmentId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('assignmentId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentAccessController.prototype, "assignment", null);
exports.StudentAccessController = StudentAccessController = __decorate([
    (0, swagger_1.ApiTags)('student-access'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, common_1.Controller)('student-access'),
    __metadata("design:paramtypes", [student_access_service_1.StudentAccessService,
        learning_service_1.LearningService,
        assignments_service_1.AssignmentsService])
], StudentAccessController);
//# sourceMappingURL=student-access.controller.js.map
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
exports.StudentActivityController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const student_access_service_1 = require("../student-access/student-access.service");
const activities_service_1 = require("./activities.service");
const activity_sessions_service_1 = require("./activity-sessions.service");
const activities_dto_1 = require("./dto/activities.dto");
let StudentActivityController = class StudentActivityController {
    access;
    activitiesService;
    sessions;
    constructor(access, activitiesService, sessions) {
        this.access = access;
        this.activitiesService = activitiesService;
        this.sessions = sessions;
    }
    async activities(token) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.activitiesService.listForStudent(studentId);
    }
    async activity(token, activityId) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.activitiesService.summaryForStudent(studentId, activityId);
    }
    async start(token, activityId) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.sessions.start(studentId, activityId);
    }
    async session(token, sessionId) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.sessions.getForStudent(studentId, sessionId);
    }
    async pause(token, sessionId) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.sessions.pause(studentId, sessionId);
    }
    async resume(token, sessionId) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.sessions.resume(studentId, sessionId);
    }
    async finish(token, sessionId) {
        const studentId = await this.access.studentIdFromToken(token);
        return this.sessions.finish(studentId, sessionId);
    }
    async recordEvent(token, sessionId, body) {
        const studentId = await this.access.studentIdFromToken(token);
        await this.sessions.recordEvent(studentId, sessionId, body);
        return this.sessions.getForStudent(studentId, sessionId);
    }
};
exports.StudentActivityController = StudentActivityController;
__decorate([
    (0, common_1.Get)(':token/activities'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "activities", null);
__decorate([
    (0, common_1.Get)(':token/activities/:activityId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('activityId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "activity", null);
__decorate([
    (0, common_1.Post)(':token/activities/:activityId/start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('activityId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "start", null);
__decorate([
    (0, common_1.Get)(':token/activity-sessions/:sessionId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "session", null);
__decorate([
    (0, common_1.Post)(':token/activity-sessions/:sessionId/pause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(':token/activity-sessions/:sessionId/resume'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)(':token/activity-sessions/:sessionId/finish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "finish", null);
__decorate([
    (0, common_1.Post)(':token/activity-sessions/:sessionId/events'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, activities_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], StudentActivityController.prototype, "recordEvent", null);
exports.StudentActivityController = StudentActivityController = __decorate([
    (0, swagger_1.ApiTags)('student-access'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, common_1.Controller)('student-access'),
    __metadata("design:paramtypes", [student_access_service_1.StudentAccessService,
        activities_service_1.ActivitiesService,
        activity_sessions_service_1.ActivitySessionsService])
], StudentActivityController);
//# sourceMappingURL=student-activity.controller.js.map
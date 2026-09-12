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
exports.PlayAccessController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const activities_service_1 = require("./activities.service");
const activity_sessions_service_1 = require("./activity-sessions.service");
const activities_dto_1 = require("./dto/activities.dto");
const play_access_service_1 = require("./play-access.service");
let PlayAccessController = class PlayAccessController {
    play;
    activities;
    sessions;
    constructor(play, activities, sessions) {
        this.play = play;
        this.activities = activities;
        this.sessions = sessions;
    }
    async resolve(token) {
        const access = await this.play.requireValid(token);
        const activity = await this.activities.summaryForStudent(access.studentId, access.activityId);
        return { access, activity };
    }
    async start(token) {
        const access = await this.play.requireValid(token);
        const started = await this.sessions.start(access.studentId, access.activityId);
        await this.play.consumeIfSingleUse(token);
        return started;
    }
    async session(token, sessionId) {
        const access = await this.play.requireValid(token);
        return this.sessions.getForStudent(access.studentId, sessionId);
    }
    async pause(token, sessionId) {
        const access = await this.play.requireValid(token);
        return this.sessions.pause(access.studentId, sessionId);
    }
    async resume(token, sessionId) {
        const access = await this.play.requireValid(token);
        return this.sessions.resume(access.studentId, sessionId);
    }
    async finish(token, sessionId) {
        const access = await this.play.requireValid(token);
        return this.sessions.finish(access.studentId, sessionId);
    }
    async recordEvent(token, sessionId, body) {
        const access = await this.play.requireValid(token);
        await this.sessions.recordEvent(access.studentId, sessionId, body);
        return this.sessions.getForStudent(access.studentId, sessionId);
    }
};
exports.PlayAccessController = PlayAccessController;
__decorate([
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "resolve", null);
__decorate([
    (0, common_1.Post)(':token/start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "start", null);
__decorate([
    (0, common_1.Get)(':token/sessions/:sessionId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "session", null);
__decorate([
    (0, common_1.Post)(':token/sessions/:sessionId/pause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(':token/sessions/:sessionId/resume'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)(':token/sessions/:sessionId/finish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "finish", null);
__decorate([
    (0, common_1.Post)(':token/sessions/:sessionId/events'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('sessionId', new common_1.ParseIntPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, activities_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], PlayAccessController.prototype, "recordEvent", null);
exports.PlayAccessController = PlayAccessController = __decorate([
    (0, swagger_1.ApiTags)('play-access'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, common_1.Controller)('play-access'),
    __metadata("design:paramtypes", [play_access_service_1.PlayAccessService,
        activities_service_1.ActivitiesService,
        activity_sessions_service_1.ActivitySessionsService])
], PlayAccessController);
//# sourceMappingURL=play-access.controller.js.map
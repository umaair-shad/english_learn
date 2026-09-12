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
exports.ActivitiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const activities_service_1 = require("./activities.service");
const activity_sessions_service_1 = require("./activity-sessions.service");
const activities_dto_1 = require("./dto/activities.dto");
const play_access_service_1 = require("./play-access.service");
let ActivitiesController = class ActivitiesController {
    service;
    sessionsService;
    play;
    constructor(service, sessionsService, play) {
        this.service = service;
        this.sessionsService = sessionsService;
        this.play = play;
    }
    list(query) {
        return this.service.list(query);
    }
    getById(id) {
        return this.service.getById(id);
    }
    sessions(id) {
        return this.sessionsService.listSessions(id);
    }
    create(req, body) {
        return this.service.create(req.teacher.teacherId, body);
    }
    update(id, body) {
        return this.service.update(id, body);
    }
    remove(id) {
        return this.service.remove(id);
    }
    createPlayLink(id, body) {
        return this.play.createToken(id, body.linkType ?? 'PERMANENT', body.expiresInSeconds);
    }
    regeneratePlayLink(id, body) {
        return this.play.createToken(id, body.linkType ?? 'PERMANENT', body.expiresInSeconds);
    }
    async revokePlayLink(id) {
        await this.play.revoke(id);
        return { id, revoked: true };
    }
};
exports.ActivitiesController = ActivitiesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_dto_1.ActivityQueryDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)(':id/sessions'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "sessions", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, activities_dto_1.CreateActivityDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, activities_dto_1.UpdateActivityDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/access-token'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, activities_dto_1.CreateActivityLinkDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "createPlayLink", null);
__decorate([
    (0, common_1.Post)(':id/access-token/regenerate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, activities_dto_1.CreateActivityLinkDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "regeneratePlayLink", null);
__decorate([
    (0, common_1.Post)(':id/access-token/revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "revokePlayLink", null);
exports.ActivitiesController = ActivitiesController = __decorate([
    (0, swagger_1.ApiTags)('activities'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('activities'),
    __metadata("design:paramtypes", [activities_service_1.ActivitiesService,
        activity_sessions_service_1.ActivitySessionsService,
        play_access_service_1.PlayAccessService])
], ActivitiesController);
//# sourceMappingURL=activities.controller.js.map
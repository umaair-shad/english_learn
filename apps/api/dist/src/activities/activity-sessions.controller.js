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
exports.ActivitySessionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const activity_sessions_service_1 = require("./activity-sessions.service");
const activities_dto_1 = require("./dto/activities.dto");
let ActivitySessionsController = class ActivitySessionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    getSession(id) {
        return this.service.getTeacherSession(id);
    }
    events(id, query) {
        return this.service.events(id, query);
    }
};
exports.ActivitySessionsController = ActivitySessionsController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ActivitySessionsController.prototype, "getSession", null);
__decorate([
    (0, common_1.Get)(':id/events'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseIntPipe())),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, activities_dto_1.SessionEventListQueryDto]),
    __metadata("design:returntype", void 0)
], ActivitySessionsController.prototype, "events", null);
exports.ActivitySessionsController = ActivitySessionsController = __decorate([
    (0, swagger_1.ApiTags)('activity-sessions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('activity-sessions'),
    __metadata("design:paramtypes", [activity_sessions_service_1.ActivitySessionsService])
], ActivitySessionsController);
//# sourceMappingURL=activity-sessions.controller.js.map
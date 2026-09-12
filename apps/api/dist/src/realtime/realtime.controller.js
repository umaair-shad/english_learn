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
exports.RealtimeController = exports.LiveQueryDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_1 = require("@nestjs/jwt");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const realtime_service_1 = require("./realtime.service");
class LiveQueryDto {
    online;
}
exports.LiveQueryDto = LiveQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LiveQueryDto.prototype, "online", void 0);
let RealtimeController = class RealtimeController {
    realtime;
    jwtService;
    constructor(realtime, jwtService) {
        this.realtime = realtime;
        this.jwtService = jwtService;
    }
    live(query, req) {
        const teacher = req.teacher;
        if (!teacher)
            return [];
        return this.realtime.liveSnapshot(teacher.teacherId, query.online);
    }
    async credentials(req) {
        const teacher = req.teacher;
        if (!teacher) {
            throw new common_1.UnauthorizedException('Not authenticated');
        }
        const accessToken = await this.jwtService.signAsync({ sub: teacher.teacherId.toString(), email: teacher.email }, { expiresIn: '15m' });
        return { accessToken };
    }
};
exports.RealtimeController = RealtimeController;
__decorate([
    (0, common_1.Get)('live'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LiveQueryDto, Object]),
    __metadata("design:returntype", void 0)
], RealtimeController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('credentials'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RealtimeController.prototype, "credentials", null);
exports.RealtimeController = RealtimeController = __decorate([
    (0, swagger_1.ApiTags)('realtime'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('realtime'),
    __metadata("design:paramtypes", [realtime_service_1.RealtimeService,
        jwt_1.JwtService])
], RealtimeController);
//# sourceMappingURL=realtime.controller.js.map
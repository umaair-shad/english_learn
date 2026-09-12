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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const current_teacher_decorator_1 = require("../common/decorators/current-teacher.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const teachers_service_1 = require("../teachers/teachers.service");
const auth_service_1 = require("./auth.service");
const change_password_dto_1 = require("./dto/change-password.dto");
const login_dto_1 = require("./dto/login.dto");
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
let AuthController = class AuthController {
    authService;
    teachers;
    constructor(authService, teachers) {
        this.authService = authService;
        this.teachers = teachers;
    }
    async login(body, res) {
        const result = await this.authService.login(body.email, body.password);
        res.cookie(jwt_auth_guard_1.AUTH_COOKIE, result.accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.COOKIE_SECURE === 'true' ||
                process.env.COOKIE_SECURE === '1',
            path: '/',
            maxAge: COOKIE_MAX_AGE_MS,
        });
        return {
            accessToken: result.accessToken,
            expiresIn: result.expiresIn,
            teacher: result.teacher,
        };
    }
    logout(res) {
        res.clearCookie(jwt_auth_guard_1.AUTH_COOKIE, { path: '/' });
        return { ok: true };
    }
    async changePassword(teacher, body) {
        if (!teacher)
            throw new common_1.UnauthorizedException('Not authenticated');
        await this.authService.changePassword(teacher.teacherId, body.currentPassword, body.newPassword);
        return { ok: true };
    }
    async me(teacher) {
        if (!teacher)
            throw new common_1.UnauthorizedException('Not authenticated');
        return { teacher: await this.teachers.getProfile(teacher.teacherId) };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('me'),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        teachers_service_1.TeachersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
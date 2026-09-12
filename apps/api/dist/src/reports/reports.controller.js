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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_teacher_decorator_1 = require("../common/decorators/current-teacher.decorator");
const reports_dto_1 = require("./reports.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    service;
    constructor(service) {
        this.service = service;
    }
    dashboard(teacher) {
        return this.service.dashboard(teacher.teacherId);
    }
    students(teacher, query) {
        return this.service.students(teacher.teacherId, {
            search: query.search,
            limit: query.limit,
        });
    }
    activities(teacher, query) {
        return this.service.activities(teacher.teacherId, {
            studentId: query.studentId,
            activityType: query.activityType,
            from: query.from,
            to: query.to,
        });
    }
    reviewTrend(teacher, query) {
        return this.service.reviewTrend(teacher.teacherId, query.studentId, query.days);
    }
    recentActivity(teacher, query) {
        return this.service.recentActivity(teacher.teacherId, query.limit);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({
        summary: 'Teacher dashboard summary from real database state',
    }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('students'),
    (0, swagger_1.ApiOperation)({ summary: 'Per-student learning status distribution' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.ReportStudentsQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "students", null);
__decorate([
    (0, common_1.Get)('activities'),
    (0, swagger_1.ApiOperation)({
        summary: 'Activity performance (sessions, accuracy, progress)',
    }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.ReportsQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "activities", null);
__decorate([
    (0, common_1.Get)('review-trend'),
    (0, swagger_1.ApiOperation)({ summary: 'Review activity per day (correct/incorrect)' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.ReviewTrendQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "reviewTrend", null);
__decorate([
    (0, common_1.Get)('recent-activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Recent activity events across teacher students' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.RecentActivityQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "recentActivity", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map
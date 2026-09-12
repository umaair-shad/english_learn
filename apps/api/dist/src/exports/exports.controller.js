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
exports.ExportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_teacher_decorator_1 = require("../common/decorators/current-teacher.decorator");
const exports_dto_1 = require("./exports.dto");
const exports_service_1 = require("./exports.service");
let ExportsController = class ExportsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async exportVocabulary(teacher, query) {
        const file = await this.service.exportVocabulary(teacher.teacherId, query);
        return this.toStream(file, 'vocabulary');
    }
    async exportStudents(teacher, query) {
        const file = await this.service.exportStudents(teacher.teacherId, query.format);
        return this.toStream(file, 'students');
    }
    async exportLearning(teacher, query) {
        const file = await this.service.exportLearning(teacher.teacherId, query);
        return this.toStream(file, 'learning');
    }
    async exportAssignments(teacher, query) {
        const file = await this.service.exportAssignments(teacher.teacherId, query.format);
        return this.toStream(file, 'assignments');
    }
    async exportSessions(teacher, query) {
        const file = await this.service.exportSessions(teacher.teacherId, query);
        return this.toStream(file, 'sessions');
    }
    toStream(file, base) {
        const date = new Date().toISOString().slice(0, 10);
        const filename = `${base}-${date}.${file.extension}`;
        return new common_1.StreamableFile(file.buffer, {
            type: file.contentType,
            disposition: `attachment; filename="${filename}"`,
            length: file.buffer.byteLength,
        });
    }
};
exports.ExportsController = ExportsController;
__decorate([
    (0, common_1.Get)('vocabulary'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Export vocabulary catalog rows (CSV/JSON/XLSX)' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.VocabularyExportDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportVocabulary", null);
__decorate([
    (0, common_1.Get)('students'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({
        summary: 'Export teacher-owned students with learning status',
    }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.StudentsExportDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportStudents", null);
__decorate([
    (0, common_1.Get)('learning'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Export student vocabulary learning states' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.LearningExportDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportLearning", null);
__decorate([
    (0, common_1.Get)('assignments'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Export teacher assignments with progress' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.AssignmentsExportDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportAssignments", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Export activity sessions with results' }),
    __param(0, (0, current_teacher_decorator_1.CurrentTeacher)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.SessionsExportDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportSessions", null);
exports.ExportsController = ExportsController = __decorate([
    (0, swagger_1.ApiTags)('exports'),
    (0, common_1.Controller)('exports'),
    __metadata("design:paramtypes", [exports_service_1.ExportsService])
], ExportsController);
//# sourceMappingURL=exports.controller.js.map
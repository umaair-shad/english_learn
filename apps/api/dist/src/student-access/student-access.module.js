"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentAccessModule = void 0;
const common_1 = require("@nestjs/common");
const assignments_module_1 = require("../assignments/assignments.module");
const learning_module_1 = require("../learning/learning.module");
const student_access_controller_1 = require("./student-access.controller");
const student_access_service_1 = require("./student-access.service");
let StudentAccessModule = class StudentAccessModule {
};
exports.StudentAccessModule = StudentAccessModule;
exports.StudentAccessModule = StudentAccessModule = __decorate([
    (0, common_1.Module)({
        imports: [learning_module_1.LearningModule, assignments_module_1.AssignmentsModule],
        controllers: [student_access_controller_1.StudentAccessController],
        providers: [student_access_service_1.StudentAccessService],
        exports: [student_access_service_1.StudentAccessService],
    })
], StudentAccessModule);
//# sourceMappingURL=student-access.module.js.map
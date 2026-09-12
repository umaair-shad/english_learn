"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
const app_config_schema_1 = require("./config/app-config.schema");
const database_module_1 = require("./database/database.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const health_module_1 = require("./health/health.module");
const assignments_module_1 = require("./assignments/assignments.module");
const learning_module_1 = require("./learning/learning.module");
const student_access_module_1 = require("./student-access/student-access.module");
const students_module_1 = require("./students/students.module");
const teachers_module_1 = require("./teachers/teachers.module");
const vocabulary_module_1 = require("./vocabulary/vocabulary.module");
const vocabulary_sets_module_1 = require("./vocabulary-sets/vocabulary-sets.module");
const activities_module_1 = require("./activities/activities.module");
const realtime_module_1 = require("./realtime/realtime.module");
const reports_module_1 = require("./reports/reports.module");
const exports_module_1 = require("./exports/exports.module");
const imports_module_1 = require("./imports/imports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate: app_config_schema_1.AppConfigSchema,
                cache: true,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'default',
                    ttl: 60_000,
                    limit: 120,
                },
            ]),
            database_module_1.DatabaseModule,
            health_module_1.HealthModule,
            vocabulary_module_1.VocabularyModule,
            vocabulary_sets_module_1.VocabularySetsModule,
            assignments_module_1.AssignmentsModule,
            teachers_module_1.TeachersModule,
            auth_module_1.AuthModule,
            students_module_1.StudentsModule,
            learning_module_1.LearningModule,
            student_access_module_1.StudentAccessModule,
            activities_module_1.ActivitiesModule,
            realtime_module_1.RealtimeModule,
            reports_module_1.ReportsModule,
            exports_module_1.ExportsModule,
            imports_module_1.ImportsModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
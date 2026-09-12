"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesModule = void 0;
const common_1 = require("@nestjs/common");
const learning_module_1 = require("../learning/learning.module");
const realtime_module_1 = require("../realtime/realtime.module");
const student_access_module_1 = require("../student-access/student-access.module");
const activities_controller_1 = require("./activities.controller");
const activities_service_1 = require("./activities.service");
const activity_events_service_1 = require("./activity-events.service");
const activity_learning_service_1 = require("./activity-learning.service");
const activity_sessions_controller_1 = require("./activity-sessions.controller");
const activity_sessions_service_1 = require("./activity-sessions.service");
const student_activities_controller_1 = require("./student-activities.controller");
const student_activity_controller_1 = require("./student-activity.controller");
const play_access_controller_1 = require("./play-access.controller");
const play_access_service_1 = require("./play-access.service");
let ActivitiesModule = class ActivitiesModule {
};
exports.ActivitiesModule = ActivitiesModule;
exports.ActivitiesModule = ActivitiesModule = __decorate([
    (0, common_1.Module)({
        imports: [learning_module_1.LearningModule, student_access_module_1.StudentAccessModule, realtime_module_1.RealtimeModule],
        controllers: [
            activities_controller_1.ActivitiesController,
            activity_sessions_controller_1.ActivitySessionsController,
            student_activities_controller_1.StudentActivitiesController,
            student_activity_controller_1.StudentActivityController,
            play_access_controller_1.PlayAccessController,
        ],
        providers: [
            activities_service_1.ActivitiesService,
            activity_events_service_1.ActivityEventsService,
            activity_learning_service_1.ActivityLearningService,
            activity_sessions_service_1.ActivitySessionsService,
            play_access_service_1.PlayAccessService,
        ],
        exports: [activities_service_1.ActivitiesService, activity_sessions_service_1.ActivitySessionsService, play_access_service_1.PlayAccessService],
    })
], ActivitiesModule);
//# sourceMappingURL=activities.module.js.map
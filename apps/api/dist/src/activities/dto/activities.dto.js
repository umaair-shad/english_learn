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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionEventListQueryDto = exports.CreateEventDto = exports.UpdateActivityDto = exports.CreateActivityLinkDto = exports.ACTIVITY_LINK_TYPES = exports.CreateActivityDto = exports.SettingsObjectDto = exports.ActivityQueryDto = exports.POSTABLE_EVENT_TYPES = exports.ACTIVITY_EVENT_TYPES = exports.SESSION_STATUSES = exports.ACTIVITY_STATUSES = exports.ACTIVITY_TYPES = void 0;
exports.requiresSense = requiresSense;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.ACTIVITY_TYPES = [
    'FLASHCARDS',
    'MEMORY',
    'QUIZ',
    'FILL_BLANK',
];
exports.ACTIVITY_STATUSES = [
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
];
exports.SESSION_STATUSES = [
    'ACTIVE',
    'PAUSED',
    'FINISHED',
    'ABANDONED',
];
exports.ACTIVITY_EVENT_TYPES = [
    'ACTIVITY_STARTED',
    'CARD_SHOWN',
    'ANSWER_SUBMITTED',
    'ANSWER_CORRECT',
    'ANSWER_INCORRECT',
    'MATCH_FOUND',
    'MATCH_FAILED',
    'QUESTION_COMPLETED',
    'PAUSED',
    'RESUMED',
    'FINISHED',
];
exports.POSTABLE_EVENT_TYPES = [
    'CARD_SHOWN',
    'ANSWER_SUBMITTED',
    'ANSWER_CORRECT',
    'ANSWER_INCORRECT',
    'MATCH_FOUND',
    'MATCH_FAILED',
    'QUESTION_COMPLETED',
];
const SENSE_BOUND_EVENT_TYPES = new Set([
    'CARD_SHOWN',
    'ANSWER_SUBMITTED',
    'ANSWER_CORRECT',
    'ANSWER_INCORRECT',
    'MATCH_FOUND',
    'MATCH_FAILED',
    'QUESTION_COMPLETED',
]);
function requiresSense(eventType) {
    return SENSE_BOUND_EVENT_TYPES.has(eventType);
}
class ActivityQueryDto {
    studentId;
    assignmentId;
    activityType;
    status;
    search;
    page = 1;
    limit = 20;
}
exports.ActivityQueryDto = ActivityQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ActivityQueryDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ActivityQueryDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.ACTIVITY_TYPES),
    __metadata("design:type", String)
], ActivityQueryDto.prototype, "activityType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.ACTIVITY_STATUSES),
    __metadata("design:type", String)
], ActivityQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ActivityQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ActivityQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ActivityQueryDto.prototype, "limit", void 0);
class SettingsObjectDto {
    settings;
}
exports.SettingsObjectDto = SettingsObjectDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SettingsObjectDto.prototype, "settings", void 0);
class CreateActivityDto extends SettingsObjectDto {
    studentId;
    assignmentId;
    activityType;
    title;
    description;
    senseIds;
    itemCount;
    selection;
    vocabularySetId;
    cefr;
    category;
    partOfSpeech;
}
exports.CreateActivityDto = CreateActivityDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateActivityDto.prototype, "studentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateActivityDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.ACTIVITY_TYPES),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "activityType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], CreateActivityDto.prototype, "senseIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateActivityDto.prototype, "itemCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['manual', 'assignment', 'set', 'assigned', 'due', 'difficult', 'catalog']),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "selection", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateActivityDto.prototype, "vocabularySetId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "cefr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreateActivityDto.prototype, "partOfSpeech", void 0);
exports.ACTIVITY_LINK_TYPES = [
    'PERMANENT',
    'EXPIRING',
    'SINGLE_USE',
];
class CreateActivityLinkDto {
    linkType = 'PERMANENT';
    expiresInSeconds;
}
exports.CreateActivityLinkDto = CreateActivityLinkDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.ACTIVITY_LINK_TYPES),
    __metadata("design:type", Object)
], CreateActivityLinkDto.prototype, "linkType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(60),
    (0, class_validator_1.Max)(31_536_000),
    __metadata("design:type", Number)
], CreateActivityLinkDto.prototype, "expiresInSeconds", void 0);
class UpdateActivityDto extends SettingsObjectDto {
    title;
    description;
    status;
}
exports.UpdateActivityDto = UpdateActivityDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.ACTIVITY_STATUSES),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "status", void 0);
class CreateEventDto {
    eventType;
    direction;
    response;
    isCorrect;
    responseTimeMs;
    rating;
    metadata;
    vocabularySenseId;
}
exports.CreateEventDto = CreateEventDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.POSTABLE_EVENT_TYPES),
    __metadata("design:type", String)
], CreateEventDto.prototype, "eventType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], CreateEventDto.prototype, "direction", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateEventDto.prototype, "response", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEventDto.prototype, "isCorrect", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(3_600_000),
    __metadata("design:type", Number)
], CreateEventDto.prototype, "responseTimeMs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['AGAIN', 'HARD', 'GOOD', 'EASY']),
    __metadata("design:type", String)
], CreateEventDto.prototype, "rating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateEventDto.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateEventDto.prototype, "vocabularySenseId", void 0);
class SessionEventListQueryDto {
    page = 1;
    limit = 200;
}
exports.SessionEventListQueryDto = SessionEventListQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], SessionEventListQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Object)
], SessionEventListQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=activities.dto.js.map
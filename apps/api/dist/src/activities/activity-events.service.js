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
exports.ActivityEventsService = exports.EVENT_TYPES = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const activities_dto_1 = require("./dto/activities.dto");
exports.EVENT_TYPES = activities_dto_1.ACTIVITY_EVENT_TYPES;
let ActivityEventsService = class ActivityEventsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    static assertPostable(eventType) {
        if (!activities_dto_1.POSTABLE_EVENT_TYPES.includes(eventType)) {
            throw new TypeError(`Event type ${eventType} cannot be submitted directly; ` +
                'use the dedicated session endpoint');
        }
    }
    async append(tx, input) {
        const row = await tx.activity_events.create({
            data: {
                session_id: BigInt(input.sessionId),
                activity_id: BigInt(input.activityId),
                student_id: BigInt(input.studentId),
                vocabulary_sense_id: input.vocabularySenseId === null
                    ? null
                    : BigInt(input.vocabularySenseId),
                event_type: input.eventType,
                direction: input.direction ?? null,
                response: input.response ?? null,
                is_correct: input.isCorrect ?? null,
                response_time_ms: input.responseTimeMs ?? null,
                metadata: input.metadata ?? client_1.Prisma.JsonNull,
                occurred_at: input.occurredAt ?? new Date(),
            },
        });
        return this.toDto(row);
    }
    toDto(row) {
        return {
            id: Number(row.id),
            sessionId: Number(row.session_id),
            activityId: Number(row.activity_id),
            studentId: Number(row.student_id),
            vocabularySenseId: row.vocabulary_sense_id === null
                ? null
                : Number(row.vocabulary_sense_id),
            eventType: row.event_type,
            direction: row.direction,
            response: row.response,
            isCorrect: row.is_correct,
            responseTimeMs: row.response_time_ms === null ? null : Number(row.response_time_ms),
            metadata: row.metadata ?? null,
            occurredAt: row.occurred_at.toISOString(),
            createdAt: row.created_at.toISOString(),
        };
    }
};
exports.ActivityEventsService = ActivityEventsService;
exports.ActivityEventsService = ActivityEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityEventsService);
//# sourceMappingURL=activity-events.service.js.map
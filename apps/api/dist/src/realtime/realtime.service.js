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
exports.RealtimeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let RealtimeService = class RealtimeService {
    prisma;
    presence = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    setPresence(studentId, sessionId, socketId) {
        const now = new Date().toISOString();
        const existing = this.presence.get(studentId);
        const record = {
            studentId,
            online: true,
            sessionId,
            connectedAt: existing?.connectedAt ?? now,
            lastSeenAt: now,
            socketId,
        };
        this.presence.set(studentId, record);
        return this.toPayload(record);
    }
    touchPresence(studentId, socketId) {
        const record = this.presence.get(studentId);
        if (!record || record.socketId !== socketId)
            return null;
        record.lastSeenAt = new Date().toISOString();
        return record;
    }
    clearPresence(studentId, socketId) {
        const record = this.presence.get(studentId);
        if (!record || record.socketId !== socketId)
            return null;
        this.presence.delete(studentId);
        return record;
    }
    getPresence(studentId) {
        const record = this.presence.get(studentId);
        return record ? this.toPayload({ ...record, online: true }) : null;
    }
    async teacherOwnsStudent(teacherId, studentId) {
        const viaActivity = await this.prisma.activities.findFirst({
            where: {
                teacher_id: BigInt(teacherId),
                student_id: BigInt(studentId),
            },
            select: { id: true },
        });
        if (viaActivity)
            return true;
        const viaAssignment = await this.prisma.assignments.findFirst({
            where: {
                created_by_teacher_id: BigInt(teacherId),
                student_id: BigInt(studentId),
            },
            select: { id: true },
        });
        return viaAssignment !== null;
    }
    async liveSnapshot(teacherId, onlyOnline) {
        const owned = new Map();
        const [activities, assignments] = await Promise.all([
            this.prisma.activities.findMany({
                where: { teacher_id: BigInt(teacherId) },
                select: {
                    student_id: true,
                    students: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            display_name: true,
                        },
                    },
                },
                distinct: ['student_id'],
            }),
            this.prisma.assignments.findMany({
                where: { created_by_teacher_id: BigInt(teacherId) },
                select: {
                    student_id: true,
                    students: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            display_name: true,
                        },
                    },
                },
                distinct: ['student_id'],
            }),
        ]);
        for (const row of [...activities, ...assignments]) {
            const s = row.students;
            owned.set(Number(s.id), {
                id: Number(s.id),
                firstName: s.first_name,
                lastName: s.last_name,
                displayName: s.display_name,
            });
        }
        const result = [];
        for (const student of owned.values()) {
            const presence = this.presence.get(student.id);
            const online = presence?.online === true;
            if (onlyOnline && !online)
                continue;
            result.push({
                studentId: student.id,
                displayName: student.displayName,
                firstName: student.firstName,
                lastName: student.lastName,
                online,
                sessionId: presence?.sessionId ?? null,
                connectedAt: presence?.connectedAt ?? null,
                lastSeenAt: presence?.lastSeenAt ?? null,
            });
        }
        result.sort((a, b) => a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()));
        return result;
    }
    toPayload(record) {
        return {
            studentId: record.studentId,
            online: true,
            sessionId: record.sessionId,
            connectedAt: record.connectedAt,
            lastSeenAt: record.lastSeenAt,
        };
    }
};
exports.RealtimeService = RealtimeService;
exports.RealtimeService = RealtimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RealtimeService);
//# sourceMappingURL=realtime.service.js.map
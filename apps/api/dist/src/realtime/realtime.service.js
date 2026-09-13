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
        const socketIds = existing?.socketIds ?? new Set();
        const sessions = existing?.sessions ?? new Map();
        socketIds.add(socketId);
        sessions.set(socketId, sessionId);
        const record = {
            studentId,
            online: true,
            sessionId: this.activeSession(sessions),
            connectedAt: existing?.connectedAt ?? now,
            lastSeenAt: now,
            socketId,
            socketIds,
            sessions,
        };
        this.presence.set(studentId, record);
        return this.toPayload(record);
    }
    touchPresence(studentId, socketId) {
        const record = this.presence.get(studentId);
        if (!record || !record.socketIds.has(socketId))
            return null;
        record.lastSeenAt = new Date().toISOString();
        return record;
    }
    clearPresence(studentId, socketId) {
        const record = this.presence.get(studentId);
        if (!record || !record.socketIds.has(socketId))
            return null;
        record.socketIds.delete(socketId);
        record.sessions.delete(socketId);
        if (record.socketIds.size > 0) {
            record.socketId = [...record.socketIds][0];
            record.sessionId = this.activeSession(record.sessions);
            record.lastSeenAt = new Date().toISOString();
            return this.toPayload(record);
        }
        this.presence.delete(studentId);
        return {
            studentId,
            online: false,
            sessionId: null,
            connectedAt: null,
            lastSeenAt: new Date().toISOString(),
        };
    }
    getPresence(studentId) {
        const record = this.presence.get(studentId);
        return record ? this.toPayload({ ...record, online: true }) : null;
    }
    async teacherOwnsStudent(teacherId, studentId) {
        void teacherId;
        const student = await this.prisma.students.findFirst({
            where: { id: BigInt(studentId) },
            select: { id: true },
        });
        return student !== null;
    }
    async liveSnapshot(teacherId, onlyOnline) {
        const owned = new Map();
        void teacherId;
        const roster = await this.prisma.students.findMany({
            where: { is_active: true },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                display_name: true,
            },
        });
        for (const s of roster) {
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
    activeSession(sessions) {
        for (const sessionId of sessions.values()) {
            if (sessionId !== null)
                return sessionId;
        }
        return null;
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
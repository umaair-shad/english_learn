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
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const jwt_1 = require("@nestjs/jwt");
const access_token_util_1 = require("../common/utils/access-token.util");
const prisma_service_1 = require("../database/prisma.service");
const student_access_service_1 = require("../student-access/student-access.service");
const realtime_service_1 = require("./realtime.service");
let RealtimeGateway = class RealtimeGateway {
    jwtService;
    studentAccess;
    realtime;
    prisma;
    server;
    constructor(jwtService, studentAccess, realtime, prisma) {
        this.jwtService = jwtService;
        this.studentAccess = studentAccess;
        this.realtime = realtime;
        this.prisma = prisma;
    }
    async handleConnection(client) {
        const auth = (client.handshake.auth ?? {});
        const token = auth.token;
        const role = auth.role;
        if (typeof token !== 'string' || token.length === 0) {
            client.disconnect(true);
            return;
        }
        if (role === 'student') {
            await this.authenticateStudent(client, token);
            return;
        }
        if (role === 'teacher') {
            await this.authenticateTeacher(client, token);
            return;
        }
        client.disconnect(true);
    }
    handleDisconnect(client) {
        const data = client.data;
        const studentId = data.studentId;
        if (typeof studentId !== 'number')
            return;
        const cleared = this.realtime.clearPresence(studentId, client.id);
        if (cleared) {
            this.server.to(this.studentRoom(studentId)).emit('live:presence', {
                studentId,
                online: false,
                sessionId: null,
                connectedAt: null,
                lastSeenAt: cleared.lastSeenAt,
            });
        }
    }
    identify(client, payload) {
        const data = client.data;
        const studentId = data.studentId;
        if (typeof studentId !== 'number')
            return { error: 'unauthenticated' };
        const rawSessionId = Number(payload?.sessionId);
        const sessionId = Number.isInteger(rawSessionId) && rawSessionId > 0 ? rawSessionId : null;
        const record = this.realtime.setPresence(studentId, sessionId, client.id);
        this.server.to(this.studentRoom(studentId)).emit('live:presence', record);
        return record;
    }
    heartbeat(client) {
        const data = client.data;
        const studentId = data.studentId;
        if (typeof studentId !== 'number')
            return { ok: false };
        this.realtime.touchPresence(studentId, client.id);
        return { ok: true };
    }
    async watch(client, payload) {
        const data = client.data;
        const teacherId = data.teacherId;
        if (typeof teacherId !== 'number') {
            client.emit('live:watch', {
                studentId: Number(payload?.studentId) || 0,
                allowed: false,
                reason: 'unauthenticated',
                presence: null,
            });
            return;
        }
        const rawStudentId = Number(payload?.studentId);
        const studentId = Number.isInteger(rawStudentId) && rawStudentId > 0 ? rawStudentId : -1;
        const owned = await this.realtime.teacherOwnsStudent(teacherId, studentId);
        if (!owned) {
            client.emit('live:watch', {
                studentId,
                allowed: false,
                reason: 'not-owned',
                presence: null,
            });
            return;
        }
        await client.join(this.studentRoom(studentId));
        client.emit('live:watch', {
            studentId,
            allowed: true,
            presence: this.realtime.getPresence(studentId),
        });
    }
    async unwatch(client, payload) {
        const rawStudentId = Number(payload?.studentId);
        const studentId = Number.isInteger(rawStudentId) && rawStudentId > 0 ? rawStudentId : -1;
        await client.leave(this.studentRoom(studentId));
        client.emit('live:unwatch', { studentId, watching: false });
    }
    emitSessionMirror(payload) {
        this.server
            .to(this.studentRoom(payload.studentId))
            .emit('live:event', payload);
    }
    async authenticateStudent(client, token) {
        let studentId;
        try {
            studentId = await this.studentAccess.studentIdFromToken(token);
        }
        catch {
            try {
                studentId = await this.studentIdFromPlayToken(token);
            }
            catch {
                client.disconnect(true);
                return;
            }
        }
        const data = client.data;
        data.studentId = studentId;
        void client.join(this.studentRoom(studentId));
        const record = this.realtime.setPresence(studentId, null, client.id);
        client.emit('live:ready', { studentId, online: true });
        this.server.to(this.studentRoom(studentId)).emit('live:presence', record);
    }
    async authenticateTeacher(client, token) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token);
        }
        catch {
            client.disconnect(true);
            return;
        }
        const teacherId = Number(payload.sub);
        if (!Number.isInteger(teacherId) || teacherId <= 0) {
            client.disconnect(true);
            return;
        }
        const data = client.data;
        data.teacherId = teacherId;
        client.emit('live:ready', { teacherId });
    }
    studentRoom(studentId) {
        return `student:${studentId}`;
    }
    async studentIdFromPlayToken(rawToken) {
        const record = await this.prisma.activity_access_tokens.findUnique({
            where: { token_hash: (0, access_token_util_1.hashAccessToken)(rawToken) },
            include: {
                activities: { select: { student_id: true, status: true } },
            },
        });
        const valid = record !== null &&
            record.is_active &&
            record.revoked_at === null &&
            (record.expires_at === null || record.expires_at > new Date()) &&
            !(record.link_type === 'SINGLE_USE' && record.consumed_at) &&
            record.activities.status !== 'CANCELLED';
        if (!valid) {
            throw new Error('invalid play token');
        }
        return Number(record.activities.student_id);
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('live:identify'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Object)
], RealtimeGateway.prototype, "identify", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('live:heartbeat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Object)
], RealtimeGateway.prototype, "heartbeat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('live:watch'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "watch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('live:unwatch'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "unwatch", null);
exports.RealtimeGateway = RealtimeGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: true, credentials: true } }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        student_access_service_1.StudentAccessService,
        realtime_service_1.RealtimeService,
        prisma_service_1.PrismaService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map
import { type OnGatewayConnection, type OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';
import { RealtimeService } from './realtime.service';
import type { MirrorPayload, PresencePayload } from './realtime.types';
export declare class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly studentAccess;
    private readonly realtime;
    private readonly prisma;
    private readonly server;
    constructor(jwtService: JwtService, studentAccess: StudentAccessService, realtime: RealtimeService, prisma: PrismaService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    identify(client: Socket, payload: {
        sessionId?: number;
    }): PresencePayload | {
        error: string;
    };
    heartbeat(client: Socket): {
        ok: boolean;
    };
    watch(client: Socket, payload: {
        studentId?: number;
    }): Promise<void>;
    unwatch(client: Socket, payload: {
        studentId?: number;
    }): Promise<void>;
    emitSessionMirror(payload: MirrorPayload): void;
    private authenticateStudent;
    private authenticateTeacher;
    private studentRoom;
    private studentIdFromPlayToken;
}

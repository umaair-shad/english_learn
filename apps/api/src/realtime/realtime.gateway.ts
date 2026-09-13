import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { JwtPayload } from '../common/guards/jwt-auth.guard';
import { hashAccessToken } from '../common/utils/access-token.util';
import { PrismaService } from '../database/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';
import { RealtimeService } from './realtime.service';
import type { MirrorPayload, PresencePayload } from './realtime.types';

/**
 * Live mirror WebSocket gateway (default socket.io namespace attached to the
 * API HTTP server). Identity is ALWAYS resolved server-side:
 *  - teacher: existing JWT signed by Nest JwtService
 *  - student: raw private access token resolved through StudentAccessService
 * Teachers may only join a student's room after a server-side ownership check.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly studentAccess: StudentAccessService,
    private readonly realtime: RealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth = (client.handshake.auth ?? {}) as {
      token?: string;
      role?: string;
    };
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

  handleDisconnect(client: Socket): void {
    const data = client.data as { studentId?: number };
    const studentId = data.studentId;
    if (typeof studentId !== 'number') return;
    const next = this.realtime.clearPresence(studentId, client.id);
    if (next) {
      this.server.to(this.studentRoom(studentId)).emit('live:presence', next);
    }
  }

  // ------------------------------------------------------- student events

  @SubscribeMessage('live:identify')
  identify(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId?: number },
  ): PresencePayload | { error: string } {
    const data = client.data as { studentId?: number };
    const studentId = data.studentId;
    if (typeof studentId !== 'number') return { error: 'unauthenticated' };
    const rawSessionId = Number(payload?.sessionId);
    const sessionId =
      Number.isInteger(rawSessionId) && rawSessionId > 0 ? rawSessionId : null;
    const record = this.realtime.setPresence(studentId, sessionId, client.id);
    this.server.to(this.studentRoom(studentId)).emit('live:presence', record);
    return record;
  }

  @SubscribeMessage('live:heartbeat')
  heartbeat(@ConnectedSocket() client: Socket): { ok: boolean } {
    const data = client.data as { studentId?: number };
    const studentId = data.studentId;
    if (typeof studentId !== 'number') return { ok: false };
    this.realtime.touchPresence(studentId, client.id);
    return { ok: true };
  }

  // ------------------------------------------------------- teacher events

  @SubscribeMessage('live:watch')
  async watch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { studentId?: number },
  ): Promise<void> {
    const data = client.data as { teacherId?: number };
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
    const studentId =
      Number.isInteger(rawStudentId) && rawStudentId > 0 ? rawStudentId : -1;

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

  @SubscribeMessage('live:unwatch')
  async unwatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { studentId?: number },
  ): Promise<void> {
    const rawStudentId = Number(payload?.studentId);
    const studentId =
      Number.isInteger(rawStudentId) && rawStudentId > 0 ? rawStudentId : -1;
    await client.leave(this.studentRoom(studentId));
    client.emit('live:unwatch', { studentId, watching: false });
  }

  // --------------------------------------------------- server-side mirror

  /** Broadcast a persisted session/event snapshot to the student room
   *  (the student's own socket plus any watching teachers). This is the only
   *  way mirror messages leave the server. */
  emitSessionMirror(payload: MirrorPayload): void {
    this.server
      .to(this.studentRoom(payload.studentId))
      .emit('live:event', payload);
  }

  // ------------------------------------------------------------------

  private async authenticateStudent(
    client: Socket,
    token: string,
  ): Promise<void> {
    let studentId: number;
    try {
      studentId = await this.studentAccess.studentIdFromToken(token);
    } catch {
      try {
        studentId = await this.studentIdFromPlayToken(token);
      } catch {
        client.disconnect(true);
        return;
      }
    }
    const data = client.data as { studentId?: number };
    data.studentId = studentId;
    void client.join(this.studentRoom(studentId));
    const record = this.realtime.setPresence(studentId, null, client.id);
    client.emit('live:ready', { studentId, online: true });
    this.server.to(this.studentRoom(studentId)).emit('live:presence', record);
  }

  private async authenticateTeacher(
    client: Socket,
    token: string,
  ): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      client.disconnect(true);
      return;
    }
    const teacherId = Number(payload.sub);
    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      client.disconnect(true);
      return;
    }
    const data = client.data as { teacherId?: number };
    data.teacherId = teacherId;
    client.emit('live:ready', { teacherId });
  }

  private studentRoom(studentId: number): string {
    return `student:${studentId}`;
  }

  private async studentIdFromPlayToken(rawToken: string): Promise<number> {
    const record = await this.prisma.activity_access_tokens.findUnique({
      where: { token_hash: hashAccessToken(rawToken) },
      include: {
        activities: { select: { student_id: true, status: true } },
      },
    });
    const valid =
      record !== null &&
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
}

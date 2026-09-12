import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

export const AUTH_COOKIE = 'vocab_auth';

export interface JwtPayload {
  sub: string;
  email: string;
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const bearer = header.slice('Bearer '.length).trim();
    if (bearer.length > 0) return bearer;
  }
  const cookies = (req as AuthenticatedRequest).cookies as
    Record<string, string | undefined> | undefined;
  const cookie = cookies?.[AUTH_COOKIE];
  if (typeof cookie === 'string' && cookie.length > 0) return cookie;
  return undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractToken(request);
    if (token === undefined)
      throw new UnauthorizedException('Not authenticated');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as AuthenticatedRequest).teacher = {
      teacherId: Number(payload.sub),
      email: payload.email,
    };
    return true;
  }
}

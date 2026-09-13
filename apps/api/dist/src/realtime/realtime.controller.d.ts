import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { RealtimeService } from './realtime.service';
export declare class LiveQueryDto {
    online?: boolean;
}
export declare class RealtimeController {
    private readonly realtime;
    private readonly jwtService;
    constructor(realtime: RealtimeService, jwtService: JwtService);
    live(query: LiveQueryDto, req: AuthenticatedRequest): Promise<import("./realtime.types").LiveStudentDto[]> | never[];
    credentials(req: AuthenticatedRequest): Promise<{
        readonly accessToken: string;
    }>;
}

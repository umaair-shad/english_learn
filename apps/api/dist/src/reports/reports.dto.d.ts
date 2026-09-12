import { ACTIVITY_TYPES } from '../activities/dto/activities.dto';
export declare class ReportsQueryDto {
    studentId?: number;
    activityType?: (typeof ACTIVITY_TYPES)[number];
    from?: string;
    to?: string;
    limit: number;
}
export declare class ReviewTrendQueryDto {
    studentId?: number;
    days: number;
}
export declare class RecentActivityQueryDto {
    limit: number;
}
export declare class ReportStudentsQueryDto {
    search?: string;
    limit: number;
}

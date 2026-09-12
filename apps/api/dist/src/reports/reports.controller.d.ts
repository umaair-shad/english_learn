import { RecentActivityQueryDto, ReportStudentsQueryDto, ReportsQueryDto, ReviewTrendQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly service;
    constructor(service: ReportsService);
    dashboard(teacher: {
        teacherId: number;
    }): Promise<unknown>;
    students(teacher: {
        teacherId: number;
    }, query: ReportStudentsQueryDto): Promise<import("./reports.service").StudentOverviewRow[]>;
    activities(teacher: {
        teacherId: number;
    }, query: ReportsQueryDto): Promise<import("./reports.service").ActivityReportRow[]>;
    reviewTrend(teacher: {
        teacherId: number;
    }, query: ReviewTrendQueryDto): Promise<import("./reports.service").ReviewTrendPoint[]>;
    recentActivity(teacher: {
        teacherId: number;
    }, query: RecentActivityQueryDto): Promise<import("./reports.service").RecentActivityRow[]>;
}

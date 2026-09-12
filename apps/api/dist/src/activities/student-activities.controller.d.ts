import { ActivitiesService } from './activities.service';
export declare class StudentActivitiesController {
    private readonly service;
    constructor(service: ActivitiesService);
    list(studentId: number): Promise<import("./activities.service").ActivityListItemDto[]>;
}

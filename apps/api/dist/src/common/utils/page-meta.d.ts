export interface PageMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export declare function pageMeta(page: number, limit: number, total: number): PageMeta;

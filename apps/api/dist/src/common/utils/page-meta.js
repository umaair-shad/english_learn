"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageMeta = pageMeta;
function pageMeta(page, limit, total) {
    const safeLimit = Math.max(1, limit);
    const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
    return {
        page,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: totalPages > 0 && page < totalPages,
        hasPrev: page > 1,
    };
}
//# sourceMappingURL=page-meta.js.map
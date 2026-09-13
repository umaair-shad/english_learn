export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function pageMeta(page: number, limit: number, total: number): PageMeta {
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

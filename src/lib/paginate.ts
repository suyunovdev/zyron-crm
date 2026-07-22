/**
 * Opt-in pagination.
 *
 * `?page` yoki `?limit` bo'lsa — pagination qo'llanadi va { skip, take } qaytadi.
 * Bo'lmasa — null (endpoint avvalgidek to'liq massiv qaytaradi, frontend buzilmaydi).
 */
export interface PageParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function getPagination(
  searchParams: URLSearchParams,
  defaultLimit = 20,
  maxLimit = 100,
): PageParams | null {
  if (!searchParams.has('page') && !searchParams.has('limit')) return null;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Paginatsiyalangan javob konverti. */
export function paginated<T>(data: T[], total: number, pg: PageParams) {
  return {
    data,
    total,
    page: pg.page,
    limit: pg.limit,
    totalPages: Math.ceil(total / pg.limit),
  };
}

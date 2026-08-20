export const paginationMeta = (
  page,
  limit,
  total
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
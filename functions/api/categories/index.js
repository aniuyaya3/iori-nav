// functions/api/categories/index.js
import { isAdminAuthenticated, errorResponse, jsonResponse, normalizeSortOrder } from '../../_middleware';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const offset = (page - 1) * pageSize;

  try {
    const { results } = await env.NAV_DB.prepare(`
        SELECT c.id, c.catelog, c.sort_order, COUNT(s.id) AS site_count
        FROM category c
        LEFT JOIN sites s ON c.id = s.catelog_id
        GROUP BY c.id, c.catelog, c.sort_order
        ORDER BY c.sort_order ASC, c.create_time DESC
        LIMIT ? OFFSET ?
      `).bind(pageSize, offset).all();
    const countResult = await env.NAV_DB.prepare(`
      SELECT COUNT(*) as total FROM category
    `).first();

    const total = countResult ? countResult.total : 0;

    return jsonResponse({
      code: 200,
      data: results,
      total,
      page,
      pageSize
    });
  } catch (e) {
    return errorResponse(`Failed to fetch categories: ${e.message}`, 500);
  }
}

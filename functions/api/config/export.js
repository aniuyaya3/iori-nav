// functions/api/config/export.js
import { isAdminAuthenticated, errorResponse } from '../../_middleware';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    // Fetch categories
    const categoriesPromise = env.NAV_DB.prepare('SELECT id, catelog, sort_order FROM category ORDER BY sort_order ASC').all();
    
    // Fetch sites
    const sitesPromise = env.NAV_DB.prepare('SELECT id, name, url, logo, desc, catelog_id, sort_order FROM sites ORDER BY sort_order ASC, create_time DESC').all();

    const [{ results: categories }, { results: sites }] = await Promise.all([categoriesPromise, sitesPromise]);

    const exportData = {
      category: categories,
      sites: sites
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);

    return new Response(jsonData, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="config.json"'
      }
    });
  } catch (e) {
    return errorResponse(`Failed to export config: ${e.message}`, 500);
  }
}

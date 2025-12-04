// functions/api/categories/[id].js
import { isAdminAuthenticated, errorResponse, jsonResponse, normalizeSortOrder } from '../../_middleware';

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const categoryId = decodeURIComponent(params.id);
  
  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    
    if (!categoryId) {
      return errorResponse('Category id is required', 400);
    }

    if (body && body.reset) {
      await env.NAV_DB.prepare('DELETE FROM category WHERE id = ?')
        .bind(categoryId)
        .run();
      
      return jsonResponse({
        code: 200,
        message: 'Category deleted successfully'
      });
    }

    const { catelog } = body;
    let { sort_order } = body;

    if (!catelog) {
      return errorResponse('Category name is required', 400);
    }

    const existingCategory = await env.NAV_DB.prepare('SELECT id FROM category WHERE catelog = ? AND id != ?')
      .bind(catelog, categoryId)
      .first();

    if (existingCategory) {
      return errorResponse('Category name already exists', 409);
    }

    sort_order = normalizeSortOrder(sort_order);

    await env.NAV_DB.prepare('UPDATE category SET catelog = ?, sort_order = ? WHERE id = ?')
      .bind(catelog, sort_order, categoryId)
      .run();
      
    return jsonResponse({
      code: 200,
      message: 'Category updated successfully'
    });
   
  } catch (e) {
    return errorResponse(`Failed to process category request: ${e.message}`, 500);
  }
}

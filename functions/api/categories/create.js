// functions/api/categories/create.js
import { isAdminAuthenticated, errorResponse, jsonResponse, normalizeSortOrder } from '../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const categoryName = (body.catelog || '').trim();
    
    if (!categoryName) {
      return errorResponse('分类名称不能为空', 400);
    }

    // 检查分类是否已存在
    const existing = await env.NAV_DB.prepare(
      'SELECT catelog FROM category WHERE catelog = ?'
    ).bind(categoryName).first();

    if (existing) {
      return errorResponse('该分类已存在', 400);
    }

    // 获取排序值,如果未提供则使用 9999
    const sortOrderValue = normalizeSortOrder(body.sort_order);

    // 插入新分类
    await env.NAV_DB.prepare(`
      INSERT INTO category (catelog, sort_order)
      VALUES (?, ?)
    `).bind(categoryName, sortOrderValue).run();

    return jsonResponse({
      code: 201,
      message: '分类创建成功',
      data: {
        catelog: categoryName,
        sort_order: sortOrderValue
      }
    }, 201);
  } catch (e) {
    return errorResponse(`创建分类失败: ${e.message}`, 500);
  }
}

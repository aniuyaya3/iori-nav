// functions/api/config/[id].js
import { isAdminAuthenticated, errorResponse, jsonResponse, normalizeSortOrder } from '../../_middleware';


export async function onRequestGet(context) {
  const { request, env, params } = context;
  const id = params.id;
  const { results } = await env.NAV_DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).all();
  if (results.length === 0) {
    return errorResponse('config not found', 404);
  }
  const config = results[0];
  return jsonResponse({
    code: 200,
    data: config
  });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }
  
  try {
    const config = await request.json();
    const { name, url, logo, desc, catelog_id, sort_order } = config;

    const sanitizedName = (name || '').trim();
    const sanitizedUrl = (url || '').trim();
    let sanitizedLogo = (logo || '').trim() || null;
    const sanitizedDesc = (desc || '').trim() || null;
    const sortOrderValue = normalizeSortOrder(sort_order);

    if (!sanitizedName || !sanitizedUrl || !catelog_id) {
      return errorResponse('Name, URL and Catelog are required', 400);
    }
    const iconAPI=env.ICON_API ||'https://favicon.im/';
    if(!logo && url){
      if(url.startsWith('https://') || url.startsWith('http://')){
        const domain = url.replace(/^https?:\/\//, '').split('/')[0];
        sanitizedLogo = iconAPI+domain;
        if(!env.ICON_API){
          sanitizedLogo+='?larger=true'
        }
      }
      
    }

    const update = await env.NAV_DB.prepare(`
      UPDATE sites
      SET name = ?, url = ?, logo = ?, desc = ?, catelog_id = ?, sort_order = ?, update_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(sanitizedName, sanitizedUrl, sanitizedLogo, sanitizedDesc, catelog_id, sortOrderValue, id).run();

    return jsonResponse({
      code: 200,
      message: 'Config updated successfully',
      update
    });
  } catch (e) {
    return errorResponse(`Failed to update config: ${e.message}`, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const del = await env.NAV_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();

    return jsonResponse({
      code: 200,
      message: 'Config deleted successfully',
      del
    });
  } catch (e) {
    return errorResponse(`Failed to delete config: ${e.message}`, 500);
  }
}

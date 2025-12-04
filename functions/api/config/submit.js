// functions/api/config/submit.js
import { isSubmissionEnabled, errorResponse, jsonResponse } from '../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  if (!isSubmissionEnabled(env)) {
    return errorResponse('Public submission disabled', 403);
  }

  try {
    const config = await request.json();
    const { name, url, logo, desc, catelog_id } = config;
    
    const sanitizedName = (name || '').trim();
    const sanitizedUrl = (url || '').trim();
    const sanitizedLogo = (logo || '').trim() || null;
    const sanitizedDesc = (desc || '').trim() || null;

    if (!sanitizedName || !sanitizedUrl || !catelog_id) {
      return errorResponse('Name, URL and Category are required', 400);
    }

    await env.NAV_DB.prepare(`
      INSERT INTO pending_sites (name, url, logo, desc, catelog_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(sanitizedName, sanitizedUrl, sanitizedLogo, sanitizedDesc, catelog_id).run();

    return jsonResponse({
      code: 201,
      message: 'Config submitted successfully, waiting for admin approve',
    }, 201);
  } catch (e) {
    return errorResponse(`Failed to submit config: ${e.message}`, 500);
  }
}

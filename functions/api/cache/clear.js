import { isAdminAuthenticated, errorResponse, jsonResponse, clearHomeCache } from '../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    await clearHomeCache(env);
    return jsonResponse({
      code: 200,
      message: '首页缓存已清除'
    });
  } catch (e) {
    return errorResponse(`Failed to clear cache: ${e.message}`, 500);
  }
}

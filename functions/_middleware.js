// functions/_middleware.js

// 辅助函数
export function normalizeSortOrder(val) {
  const num = Number(val);
  return Number.isFinite(num) ? num : 9999;
}

export function isSubmissionEnabled(env) {
  // Convert to string to handle both boolean `true` from toml and string 'true' from secrets
  return String(env.ENABLE_PUBLIC_SUBMISSION) === 'true';
}

export async function isAdminAuthenticated(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return false;
  
  const match = cookie.match(/admin_session=([^;]+)/);
  if (!match) return false;
  
  const token = match[1];
  const session = await env.NAV_AUTH.get(`session_${token}`);
  
  return Boolean(session);
}

export function errorResponse(message, status) {
  return new Response(JSON.stringify({ code: status, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// 导出中间件(可选,用于添加全局逻辑)
export async function onRequest(context) {
  // 在这里可以添加全局中间件逻辑
  // 例如: 日志记录、CORS 头等
  return context.next();
}

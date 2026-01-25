async function validateAdminSession(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return { authenticated: false };
  
  const match = cookie.match(/admin_session=([^;]+)/);
  if (!match) return { authenticated: false };
  
  const token = match[1];
  const session = await env.NAV_AUTH.get(`session_${token}`);
  
  return session ? { authenticated: true, token } : { authenticated: false };
}

async function destroyAdminSession(env, token) {
  await env.NAV_AUTH.delete(`session_${token}`);
}

function buildSessionCookie(token, options = {}) {
  const maxAge = options.maxAge !== undefined ? options.maxAge : 86400;
  return `admin_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  
  const { token } = await validateAdminSession(request, env);
  if (token) {
    await destroyAdminSession(env, token);
  }
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': buildSessionCookie('', { maxAge: 0 }),
    },
  });
}

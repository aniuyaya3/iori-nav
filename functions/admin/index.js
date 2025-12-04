// functions/admin/index.js

async function validateAdminSession(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) {
    console.log('No cookie found');
    return { authenticated: false };
  }
  
  const match = cookie.match(/admin_session=([^;]+)/);
  if (!match) {
    console.log('No session cookie found');
    return { authenticated: false };
  }
  
  const token = match[1];
  console.log('Validating token:', token.substring(0, 8) + '...');
  
  const session = await env.NAV_AUTH.get(`session_${token}`);
  
  if (session) {
    console.log('Session valid');
    return { authenticated: true, token };
  } else {
    console.log('Session invalid or expired');
    return { authenticated: false };
  }
}

// GET: 显示管理页面或重定向到登录
export async function onRequestGet(context) {
  const { request, env } = context;
  
  console.log('GET /admin');
  
  const session = await validateAdminSession(request, env);
  
  if (!session.authenticated) {
    console.log('User not authenticated, redirecting to login');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/admin/login',
      },
    });
  }
  
  console.log('User authenticated, serving admin page from public/admin/index.html');
  
  // 尝试从静态资源读取 HTML 文件
  try {
    // Pages Functions 会自动将 public 目录作为静态资源
    // 访问 /admin 时会自动查找 public/admin/index.html
    // 这里我们直接返回一个内部重定向或者读取文件
    const url = new URL(request.url);
    url.pathname = '/admin/index.html';
    
    // 使用 env.ASSETS 获取静态文件
    const response = await env.ASSETS.fetch(url);
    
    if (response.ok) {
      return response;
    } else {
      console.error('Failed to load admin HTML:', response.status);
      return new Response('管理页面加载失败', { status: 500 });
    }
  } catch (e) {
    console.error('Error loading admin page:', e);
    return new Response('管理页面加载失败: ' + e.message, { status: 500 });
  }
}

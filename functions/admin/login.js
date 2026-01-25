// functions/admin/login.js

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function createAdminSession(env, ttl = 86400) {
  const token = crypto.randomUUID();
  await env.NAV_AUTH.put(`session_${token}`, Date.now().toString(), { expirationTtl: ttl });
  return token;
}

function buildSessionCookie(token, options = {}) {
  const maxAge = options.maxAge !== undefined ? options.maxAge : 86400;
  return `admin_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function renderLoginPage(message = '') {
  const hasError = Boolean(message);
  const safeMessage = hasError ? escapeHTML(message) : '';
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理员登录</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; padding: 0; font-family: 'Noto Sans SC', sans-serif; }
    body { display: flex; justify-content: center; align-items: center; background-color: #f8f9fa; padding: 1rem; }
    .login-container {
      background-color: white; padding: 2rem; border-radius: 8px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); width: 100%; max-width: 380px;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .login-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin: 0 0 1.5rem 0; color: #333; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #555; }
    input[type="text"], input[type="password"] {
      width: 100%; padding: 0.875rem 1rem; border: 1px solid #ddd; border-radius: 6px;
      font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus { border-color: #7209b7; outline: none; box-shadow: 0 0 0 3px rgba(114, 9, 183, 0.15); }
    button {
      width: 100%; padding: 0.875rem; background-color: #7209b7; color: white; border: none;
      border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    button:hover { background-color: #5a067c; }
    button:active { transform: scale(0.98); }
    .error-message { color: #dc3545; font-size: 0.875rem; margin-top: 0.5rem; text-align: center; }
    .back-link { display: block; text-align: center; margin-top: 1.5rem; color: #7209b7; text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="login-title">管理员登录</h1>
    <form method="post" action="/admin/login" novalidate>
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" required autocomplete="username" autofocus>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      <div class="form-group">
        <label for="duration">登录有效期</label>
        <select id="duration" name="duration" style="width: 100%; padding: 0.875rem 1rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; background-color: white;">
          <option value="1">1 天</option>
          <option value="7">7 天</option>
          <option value="30">30 天</option>
          <option value="60">60 天</option>
          <option value="90">90 天</option>
        </select>
      </div>
      ${hasError ? `<div class="error-message">${safeMessage}</div>` : ''}
      <button type="submit">登 录</button>
    </form>
    <a href="/" class="back-link">返回首页</a>
  </div>
  <script>
    // 调试信息
    console.log('Login page loaded');
    
    const durationSelect = document.getElementById('duration');
    // Restore selection
    const savedDuration = localStorage.getItem('login_duration');
    if (savedDuration) {
        durationSelect.value = savedDuration;
    }

    // 检测表单提交
    document.querySelector('form').addEventListener('submit', function(e) {
      console.log('Form submitting...');
      const name = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      // Save selection
      localStorage.setItem('login_duration', durationSelect.value);

      console.log('Username:', name);
      console.log('Password length:', password.length);
    });
  </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// GET: 显示登录页面
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  
  console.log('GET /admin/login');
  
  return renderLoginPage(error || '');
}

// POST: 处理登录提交
export async function onRequestPost(context) {
  const { request, env } = context;
  
  console.log('POST /admin/login');
  
  try {
    const formData = await request.formData();
    const name = (formData.get('username') || '').trim();
    const password = (formData.get('password') || '').trim();
    const durationDays = parseInt(formData.get('duration') || '1', 10);
    const ttl = durationDays * 86400;

    console.log('Login attempt - Username:', name, 'Duration:', durationDays, 'days');

    if (!name || !password) {
      console.log('Missing credentials');
      return renderLoginPage('请输入用户名和密码');
    }

    const storedUsername = await env.NAV_AUTH.get('admin_username');
    const storedPassword = await env.NAV_AUTH.get('admin_password');

    console.log('Stored username exists:', Boolean(storedUsername));
    console.log('Stored password exists:', Boolean(storedPassword));

    if (!storedUsername || !storedPassword) {
      console.error('Admin credentials not found in KV');
      return renderLoginPage('系统配置错误，请联系管理员');
    }

    const isValid = name === storedUsername && password === storedPassword;

    if (isValid) {
      console.log('Login successful, creating session');
      const token = await createAdminSession(env, ttl);
      console.log('Session token created:', token.substring(0, 8) + '...');
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin',
          'Set-Cookie': buildSessionCookie(token, { maxAge: ttl }),
        },
      });
    }

    console.log('Invalid credentials');
    return renderLoginPage('账号或密码错误，请重试');
  } catch (e) {
    console.error('Login error:', e);
    return renderLoginPage('登录处理出错: ' + e.message);
  }
}

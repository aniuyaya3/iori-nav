export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'bing';
  const cid = url.searchParams.get('cid') || '36';
  const region = url.searchParams.get('region') || '';

  let imageUrl = '';

  try {
    if (source === 'bing') {
      const bingUrl = region === 'spotlight'
        ? 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN' // Fallback for spotlight simple fetch
        : 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';
        
      if (region === 'spotlight') {
         // Spotlight logic
         const spotRes = await fetch('https://arc.msn.com/v3/Delivery/Cache?pid=209567&fmt=json&rafb=0&ua=WindowsShellClient%2F0&disphorzres=1920&dispvertres=1080&lo=80217&pl=zh-CN&lc=zh-CN&ctry=cn&time=' + new Date().toISOString());
         if (spotRes.ok) {
             const data = await spotRes.json();
             const item = JSON.parse(data.batchrsp.items[0].item);
             imageUrl = item.ad.image_fullscreen_001_landscape.u;
         }
      } else {
         const res = await fetch(bingUrl);
         const data = await res.json();
         imageUrl = 'https://cn.bing.com' + data.images[0].url;
      }
    } else if (source === '360') {
      const res = await fetch(`http://wallpaper.apc.360.cn/index.php?c=WallPaper&a=getAppsByOrder&order=create_time&start=0&count=1&cid=${cid}`);
      const data = await res.json();
      imageUrl = data.data[0].url;
    }
  } catch (e) {
      imageUrl = ''; 
  }

  // Fallback to random fallback if empty (optional)
  
  return new Response(JSON.stringify({ url: imageUrl }), {
      headers: { 'Content-Type': 'application/json' }
  });
}
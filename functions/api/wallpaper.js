export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const params = url.searchParams;
    const source = params.get('source'); // '360' or 'bing'

    if (source === '360') {
        const action = params.get('action'); // 'categories' or 'list'
        
        if (action === 'categories') {
            const apiUrl = 'http://cdn.apc.360.cn/index.php?c=WallPaper&a=getAllCategoriesV2&from=360chrome';
            return fetchAndProxy(apiUrl);
        } else if (action === 'list') {
            const cid = params.get('cid') || '36';
            const start = params.get('start') || '0';
            const count = params.get('count') || '8';
            const apiUrl = `http://cdn.apc.360.cn/index.php?c=WallPaper&a=getAppsByCategory&from=360chrome&cid=${cid}&start=${start}&count=${count}`;
            return fetchAndProxy(apiUrl);
        }
    } else if (source === 'bing') {
        // Bing / Spotlight 壁纸
        const country = params.get('country') || '';
        let bingUrl = '';
        if (country === 'spotlight') {
            bingUrl = 'https://peapix.com/spotlight/feed?n=7';
        } else {
            bingUrl = `https://peapix.com/bing/feed?n=7&country=${country}`;
        }
        return fetchAndProxy(bingUrl);
    }

    return new Response(JSON.stringify({ code: 400, message: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function fetchAndProxy(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        return new Response(JSON.stringify({ code: 200, data: data }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Or restrictive if needed
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ code: 500, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

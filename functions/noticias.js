export async function onRequest(context) {
  const NEWS_KEY = 'dd7695a891a046fabb270718eb220064';
  const url = 'https://newsapi.org/v2/everything?q=%22FIFA+World+Cup+2026%22+OR+%22Copa+del+Mundo+2026%22&language=es&sortBy=publishedAt&pageSize=8&apiKey='+NEWS_KEY;
  
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800',
  };

  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error('NewsAPI: '+res.status);
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({articles:[], error:e.message}), { headers: CORS });
  }
}

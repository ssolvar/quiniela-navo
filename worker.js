// ================================================
// CLOUDFLARE WORKER — Quiniela Los del Navo 2026
// Sirve el sitio y hace de proxy para APIs externas
// ================================================

const FOOTBALL_KEY = '9ffbbd9890b24d43a0c2d5667a0bfbd9';
const NEWS_KEY     = 'dd7695a891a046fabb270718eb220064';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ---- PROXY: Noticias ----
    if (path === '/api/noticias') {
      try {
        const newsUrl = `https://newsapi.org/v2/everything?q=%22FIFA+World+Cup+2026%22+OR+%22Copa+del+Mundo+2026%22&language=es&sortBy=publishedAt&pageSize=8&apiKey=${NEWS_KEY}`;
        const res = await fetch(newsUrl);
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=1800' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ articles: [], error: e.message }), { headers: CORS });
      }
    }

    // ---- PROXY: Standings ----
    if (path === '/api/standings') {
      try {
        const res = await fetch('https://api.football-data.org/v4/competitions/WC/standings?season=2026', {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=300' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ standings: [], error: e.message }), { headers: CORS });
      }
    }

    // ---- PROXY: Goleadores ----
    if (path === '/api/scorers') {
      try {
        const res = await fetch('https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=10', {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=300' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ scorers: [], error: e.message }), { headers: CORS });
      }
    }

    // ---- Servir el sitio estático ----
    // Para todas las demás rutas, servir el index.html desde el KV de assets
    return env.ASSETS.fetch(request);
  }
};

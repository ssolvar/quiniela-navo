const FOOTBALL_KEY  = '9ffbbd9890b24d43a0c2d5667a0bfbd9';
const NEWS_KEY      = 'dd7695a891a046fabb270718eb220064';
const FOOTBALL_BASE = 'https://api.football-data.org/v4';
const HTML_URL      = 'https://raw.githubusercontent.com/ssolvar/quiniela-navo/main/index.html';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function normPartido(m) {
  const ft = (m.score||{}).fullTime||{};
  const fases = {
    GROUP_STAGE:'Fase de Grupos', ROUND_OF_32:'Round of 32',
    ROUND_OF_16:'Octavos de Final', QUARTER_FINALS:'Cuartos de Final',
    SEMI_FINALS:'Semifinal', THIRD_PLACE:'Tercer Lugar', FINAL:'Final'
  };
  const status = {SCHEDULED:'PRE',TIMED:'PRE',IN_PLAY:'LIVE',PAUSED:'HT',FINISHED:'FT',AWARDED:'FT'};
  return {
    id: String(m.id), local: m.homeTeam?.name||'TBD', visitante: m.awayTeam?.name||'TBD',
    localCod: m.homeTeam?.tla||'', visitanteCod: m.awayTeam?.tla||'',
    fecha: (m.utcDate||'').slice(0,10), hora: (m.utcDate||'').slice(11,16),
    fase: fases[m.stage]||'Fase de Grupos', grupo: m.group ? m.group.replace('GROUP_','Grupo '):'',
    estadio: m.venue||'', status: status[m.status]||'PRE',
    g1: ft.home??null, g2: ft.away??null, minuto: m.minute||null,
  };
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // API: Partidos
    if (path === '/api/partidos') {
      try {
        const res  = await fetch(`${FOOTBALL_BASE}/competitions/WC/matches?season=2026`, {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data = await res.json();
        return new Response(JSON.stringify({ partidos: (data.matches||[]).map(normPartido) }), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=60' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ partidos: [], error: e.message }), { headers: CORS });
      }
    }

    // API: Standings
    if (path === '/api/standings') {
      try {
        const res  = await fetch(`${FOOTBALL_BASE}/competitions/WC/standings?season=2026`, {
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

    // API: Goleadores
    if (path === '/api/scorers') {
      try {
        const res  = await fetch(`${FOOTBALL_BASE}/competitions/WC/scorers?season=2026&limit=10`, {
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

    // API: Noticias via Google News RSS
    if (path === '/api/noticias') {
      try {
        // Google News RSS - noticias del Mundial en español de todos los países
        const rssUrl = 'https://news.google.com/rss/search?q=Copa+del+Mundo+2026+FIFA&hl=es-419&gl=US&ceid=US:es-419';
        const res = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuinielaNavo/1.0)' }
        });
        const xml = await res.text();
        
        // Parse RSS XML manually
        const items = [];
        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (const match of itemMatches) {
          const item = match[1];
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
          const link  = (item.match(/<link>(.*?)<\/link>/) || [])[1]?.trim() || '';
          const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]?.trim() || '';
          const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1]?.trim() || '';
          const thumb = (item.match(/<media:thumbnail[^>]*url="([^"]*)"/) || [])[1] || null;
          if(title && link) items.push({ title, url: link, publishedAt: pubDate, source: { name: source }, urlToImage: thumb });
          if(items.length >= 10) break;
        }
        // Ordenar por fecha más reciente
        items.sort((a,b) => {
          const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const db2 = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return db2 - da;
        });
        return new Response(JSON.stringify({ articles: items.slice(0,10) }), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=900' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ articles: [], error: e.message }), { headers: CORS });
      }
    }

    // Servir index.html desde GitHub
    try {
      const res = await fetch(HTML_URL, { cf: { cacheEverything: true, cacheTtl: 300 } });
      const html = await res.text();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
      });
    } catch(e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};

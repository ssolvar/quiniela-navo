// ================================================
// CLOUDFLARE WORKER — Quiniela Los del Navo 2026
// ================================================

const FOOTBALL_KEY = '9ffbbd9890b24d43a0c2d5667a0bfbd9';
const NEWS_KEY     = 'dd7695a891a046fabb270718eb220064';
const FOOTBALL_BASE = 'https://api.football-data.org/v4';

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
    id: String(m.id),
    local: m.homeTeam?.name||'TBD',
    visitante: m.awayTeam?.name||'TBD',
    localCod: m.homeTeam?.tla||'',
    visitanteCod: m.awayTeam?.tla||'',
    fecha: (m.utcDate||'').slice(0,10),
    hora: (m.utcDate||'').slice(11,16),
    fase: fases[m.stage]||'Fase de Grupos',
    grupo: m.group ? m.group.replace('GROUP_','Grupo '):'',
    estadio: m.venue||'',
    status: status[m.status]||'PRE',
    g1: ft.home??null,
    g2: ft.away??null,
    minuto: m.minute||null,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ---- PROXY: Partidos ----
    if (path === '/api/partidos') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/matches?season=2026`, {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data = await res.json();
        const partidos = (data.matches||[]).map(normPartido);
        return new Response(JSON.stringify({ partidos }), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=60' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ partidos: [], error: e.message }), { headers: CORS });
      }
    }

    // ---- PROXY: Standings ----
    if (path === '/api/standings') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/standings?season=2026`, {
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
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/scorers?season=2026&limit=10`, {
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

    // ---- Servir sitio estático ----
    return env.ASSETS.fetch(request);
  }
};

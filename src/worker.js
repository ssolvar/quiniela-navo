const FOOTBALL_KEY  = '9629fc7059cd4418a697d0d21f2eb10b';
const NEWS_KEY      = 'dd7695a891a046fabb270718eb220064';
const FOOTBALL_BASE = 'https://api.football-data.org/v4';
const HTML_URL      = 'https://raw.githubusercontent.com/ssolvar/quiniela-navo/main/index.html';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function kvGet(kv, key) {
  const val = await kv.get(key);
  if(!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}
async function kvSet(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

function normPartido(m) {
  const ft = (m.score||{}).fullTime||{};
  const fases = {GROUP_STAGE:'Fase de Grupos',ROUND_OF_32:'Round of 32',ROUND_OF_16:'Octavos de Final',QUARTER_FINALS:'Cuartos de Final',SEMI_FINALS:'Semifinal',THIRD_PLACE:'Tercer Lugar',FINAL:'Final'};
  const status = {SCHEDULED:'PRE',TIMED:'PRE',IN_PLAY:'LIVE',PAUSED:'HT',FINISHED:'FT',AWARDED:'FT'};
  return {
    id:String(m.id), local:m.homeTeam?.name||'TBD', visitante:m.awayTeam?.name||'TBD',
    localCod:m.homeTeam?.tla||'', visitanteCod:m.awayTeam?.tla||'',
    fecha:(m.utcDate||'').slice(0,10), hora:(m.utcDate||'').slice(11,16),
    fase:fases[m.stage]||'Fase de Grupos', grupo:m.group?m.group.replace('GROUP_','Grupo '):'',
    estadio:m.venue||'', status:status[m.status]||'PRE',
    g1:ft.home??null, g2:ft.away??null, minuto:m.minute||null,
  };
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const KV   = env.KV;

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // ==========================================
    // CHAT — key separada, nunca se mezcla
    // ==========================================
    if (path === '/api/chat') {
      if (request.method === 'GET') {
        const chat = await kvGet(KV, 'CHAT') || [];
        return new Response(JSON.stringify({ chat }), { headers: CORS });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        let chat = await kvGet(KV, 'CHAT') || [];
        if (body.accion === 'agregar' && body.mensaje) {
          if (!chat.find(m => m.id === body.mensaje.id)) {
            chat = [...chat, body.mensaje].slice(-20);
            await kvSet(KV, 'CHAT', chat);
          }
        } else if (body.accion === 'borrar' && body.id) {
          chat = chat.filter(m => m.id !== body.id);
          await kvSet(KV, 'CHAT', chat);
        }
        return new Response(JSON.stringify({ chat }), { headers: CORS });
      }
    }

    // ==========================================
    // DB — todos los datos excepto chat y partidos
    // ==========================================
    if (path === '/api/db') {
      if (request.method === 'GET') {
        const [participantes, predicciones, premios, retos, presencia, partidos, partidosFetchedAt] = await Promise.all([
          kvGet(KV, 'participantes'),
          kvGet(KV, 'predicciones'),
          kvGet(KV, 'premios'),
          kvGet(KV, 'retos'),
          kvGet(KV, 'presencia'),
          kvGet(KV, 'partidos'),
          kvGet(KV, 'partidosFetchedAt'),
        ]);
        return new Response(JSON.stringify({
          participantes: participantes || [],
          predicciones:  predicciones  || [],
          premios:       premios       || [],
          retos:         retos         || [],
          presencia:     presencia     || [],
          partidos:      partidos      || [],
          partidosFetchedAt: partidosFetchedAt || null,
          chat: [], // chat viene de /api/chat, no de aqui
        }), { headers: CORS });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        const fields = ['participantes','predicciones','premios','retos','presencia','partidos','partidosFetchedAt'];
        await Promise.all(fields.filter(f => body[f] !== undefined).map(f => kvSet(KV, f, body[f])));
        return new Response(JSON.stringify({ ok: true }), { headers: CORS });
      }
    }

    // ==========================================
    // PARTIDOS — actualizar desde football API
    // ==========================================
    if (path === '/api/partidos') {
      try {
        // Intentar football-data.org primero
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/matches?season=2026`, {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data = await res.json();
        if(data.matches && data.matches.length > 0) {
          const partidos = data.matches.map(normPartido);
          const partidosFetchedAt = new Date().toISOString();
          await Promise.all([
            kvSet(KV, 'partidos', partidos),
            kvSet(KV, 'partidosFetchedAt', partidosFetchedAt),
          ]);
          return new Response(JSON.stringify({ partidos, partidosFetchedAt }), { headers: CORS });
        }
        // Si falla, intentar API alternativa
        const res2 = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data2 = await res2.json();
        if(data2.matches && data2.matches.length > 0) {
          const partidos = data2.matches.map(normPartido);
          const partidosFetchedAt = new Date().toISOString();
          await Promise.all([
            kvSet(KV, 'partidos', partidos),
            kvSet(KV, 'partidosFetchedAt', partidosFetchedAt),
          ]);
          return new Response(JSON.stringify({ partidos, partidosFetchedAt }), { headers: CORS });
        }
        // Usar KV cache
        const partidos = await kvGet(KV, 'partidos') || [];
        return new Response(JSON.stringify({ partidos, fromCache: true }), { headers: CORS });
      } catch(e) {
        const partidos = await kvGet(KV, 'partidos') || [];
        return new Response(JSON.stringify({ partidos, error: e.message }), { headers: CORS });
      }
    }

    // ==========================================
    // STANDINGS
    // ==========================================
    if (path === '/api/standings') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/standings?season=2026`, { headers: {'X-Auth-Token':FOOTBALL_KEY} });
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: {...CORS,'Cache-Control':'public, max-age=300'} });
      } catch(e) {
        return new Response(JSON.stringify({standings:[],error:e.message}), { headers: CORS });
      }
    }

    // ==========================================
    // GOLEADORES
    // ==========================================
    if (path === '/api/scorers') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/scorers?season=2026&limit=10`, { headers: {'X-Auth-Token':FOOTBALL_KEY} });
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: {...CORS,'Cache-Control':'public, max-age=300'} });
      } catch(e) {
        return new Response(JSON.stringify({scorers:[],error:e.message}), { headers: CORS });
      }
    }

    // ==========================================
    // NOTICIAS
    // ==========================================
    if (path === '/api/noticias') {
      try {
        const rssUrl = 'https://news.google.com/rss/search?q=Mundial+2026+OR+Copa+del+Mundo+2026+OR+FIFA+2026+OR+gol+Mundial+OR+partido+Mundial+OR+seleccion+Mundial+OR+resultado+Copa+OR+clasificacion+Mundial+OR+goleador+Mundial+OR+arbitro+Mundial&hl=es-419&gl=US&ceid=US:es-419';
        const res = await fetch(rssUrl, { headers: {'User-Agent':'Mozilla/5.0 (compatible; QuinielaNavo/1.0)'} });
        const xml = await res.text();
        const items = [];
        for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
          const item = match[1];
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
          const link = (item.match(/<link>(.*?)<\/link>/) || [])[1]?.trim() || '';
          const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]?.trim() || '';
          const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1]?.trim() || '';
          if(title && link) items.push({ title, url:link, publishedAt:pubDate, source:{name:source}, urlToImage:null });
          if(items.length >= 20) break;
        }
        items.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        const hace24h = Date.now() - 24*60*60*1000;
        const recientes = items.filter(i => new Date(i.publishedAt).getTime() > hace24h);
        return new Response(JSON.stringify({ articles: recientes.length >= 5 ? recientes.slice(0,10) : items.slice(0,10) }), {
          headers: {...CORS,'Cache-Control':'public, max-age=300'}
        });
      } catch(e) {
        return new Response(JSON.stringify({articles:[],error:e.message}), { headers: CORS });
      }
    }

    // ==========================================
    // HTML — servir app
    // ==========================================
    try {
      const res = await fetch(HTML_URL);
      const html = await res.text();
      return new Response(html, { headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'} });
    } catch(e) {
      return new Response('Error: '+e.message, { status: 500 });
    }
  }
};

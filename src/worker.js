// ================================================
// CLOUDFLARE WORKER — Quiniela Los del Navo 2026
// DB: Cloudflare KV (participantes, predicciones, premios, retos, chat, presencia)
// Partidos: JSONBin (cache, pocas llamadas)
// ================================================

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

// ---- KV helpers ----
async function kvGet(kv, key) {
  const val = await kv.get(key);
  if(!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

async function kvSet(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const KV   = env.KV;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ---- KV: Leer campo específico ----
    if (path.startsWith('/api/kv/') && request.method === 'GET') {
      const key = path.replace('/api/kv/', '');
      try {
        const val = await kvGet(KV, key);
        return new Response(JSON.stringify({ key, value: val }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: CORS, status: 500 });
      }
    }

    // ---- KV: Escribir campo específico ----
    if (path.startsWith('/api/kv/') && request.method === 'POST') {
      const key = path.replace('/api/kv/', '');
      try {
        const body = await request.json();
        await kvSet(KV, key, body.value);
        return new Response(JSON.stringify({ ok: true }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: CORS, status: 500 });
      }
    }

    // ---- KV: Leer todos los datos ----
    if (path === '/api/db' && request.method === 'GET') {
      try {
        const [participantes, predicciones, premios, retos, chat, presencia] = await Promise.all([
          kvGet(KV, 'participantes'),
          kvGet(KV, 'predicciones'),
          kvGet(KV, 'premios'),
          kvGet(KV, 'retos'),
          kvGet(KV, 'chat'),
          kvGet(KV, 'presencia'),
        ]);
        // Partidos en KV
        const partidos = await kvGet(KV, 'partidos') || [];
        const partidosFetchedAt = await kvGet(KV, 'partidosFetchedAt') || null;

        return new Response(JSON.stringify({
          participantes: participantes || [],
          predicciones:  predicciones  || [],
          premios:       premios       || [],
          retos:         retos         || [],
          chat:          chat          || [],
          presencia:     presencia     || [],
          partidos,
          partidosFetchedAt,
        }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: CORS, status: 500 });
      }
    }

    // ---- KV: Guardar campos específicos ----
    if (path === '/api/db' && request.method === 'POST') {
      try {
        const body = await request.json();
        const writes = [];
        const kvFields = ['participantes','predicciones','premios','retos','presencia'];
        for(const field of kvFields) {
          if(body[field] !== undefined) {
            writes.push(kvSet(KV, field, body[field]));
          }
        }
        // Chat NO se toca aquí — usa /api/chat
        // Partidos en KV
        if(body.partidos !== undefined) writes.push(kvSet(KV, 'partidos', body.partidos));
        if(body.partidosFetchedAt !== undefined) writes.push(kvSet(KV, 'partidosFetchedAt', body.partidosFetchedAt));
        await Promise.all(writes);
        return new Response(JSON.stringify({ ok: true }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: CORS, status: 500 });
      }
    }

    // ---- CHAT: endpoint dedicado — key separada en KV ----
    if (path === '/api/chat') {
      if (request.method === 'GET') {
        const chat = await kvGet(KV, 'chat_mensajes') || [];
        return new Response(JSON.stringify({ chat }), { headers: CORS });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        let chat = await kvGet(KV, 'chat_mensajes') || [];
        if(body.accion === 'agregar' && body.mensaje) {
          // Solo agregar si no existe ya
          if(!chat.find(m=>m.id===body.mensaje.id)) {
            chat = [...chat, body.mensaje].slice(-20);
            await kvSet(KV, 'chat_mensajes', chat);
          }
        } else if(body.accion === 'borrar' && body.id) {
          chat = chat.filter(m=>m.id!==body.id);
          await kvSet(KV, 'chat_mensajes', chat);
        }
        return new Response(JSON.stringify({ chat }), { headers: CORS });
      }
    }

    // ---- CHAT: endpoint dedicado ----
    if (path === '/api/chat') {
      if (request.method === 'GET') {
        // Combinar mensajes de ambas keys y migrar a chat_mensajes
        const [chatViejo, chatNuevo] = await Promise.all([
          kvGet(KV, 'chat'),
          kvGet(KV, 'chat_mensajes')
        ]);
        const todos = [...(chatViejo||[]), ...(chatNuevo||[])];
        // Deduplicar por id
        const vistos = new Set();
        const unicos = todos.filter(m => {
          if(vistos.has(m.id)) return false;
          vistos.add(m.id); return true;
        });
        // Ordenar por fecha
        unicos.sort((a,b) => new Date(a.ts) - new Date(b.ts));
        const final = unicos.slice(-20);
        // Migrar todo a chat_mensajes y limpiar chat viejo
        if(chatViejo && chatViejo.length > 0) {
          await Promise.all([
            kvSet(KV, 'chat_mensajes', final),
            kvSet(KV, 'chat', [])
          ]);
        }
        return new Response(JSON.stringify({ chat: final }), { headers: CORS });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        let chat = await kvGet(KV, 'chat_mensajes') || [];
        // También incluir mensajes viejos si los hay
        const chatViejo = await kvGet(KV, 'chat') || [];
        if(chatViejo.length > 0) {
          const todos = [...chatViejo, ...chat];
          const vistos = new Set();
          chat = todos.filter(m => {
            if(vistos.has(m.id)) return false;
            vistos.add(m.id); return true;
          }).sort((a,b) => new Date(a.ts) - new Date(b.ts)).slice(-20);
          await kvSet(KV, 'chat', []);
        }
        if(body.accion === 'agregar' && body.mensaje) {
          if(!chat.find(m=>m.id===body.mensaje.id)) {
            chat = [...chat, body.mensaje].slice(-20);
          }
        } else if(body.accion === 'borrar' && body.id) {
          chat = chat.filter(m=>m.id!==body.id);
        }
        await kvSet(KV, 'chat_mensajes', chat);
        return new Response(JSON.stringify({ chat }), { headers: CORS });
      }
    }

    // ---- API: Partidos ----
    if (path === '/api/partidos') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/matches?season=2026`, {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        });
        const data = await res.json();
        const partidos = (data.matches||[]).map(normPartido);
        const partidosFetchedAt = new Date().toISOString();
        await Promise.all([
          kvSet(KV, 'partidos', partidos),
          kvSet(KV, 'partidosFetchedAt', partidosFetchedAt)
        ]);
        return new Response(JSON.stringify({ partidos, partidosFetchedAt }), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=60' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ partidos: [], error: e.message }), { headers: CORS });
      }
    }

    // ---- API: Standings ----
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

    // ---- API: Goleadores ----
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

    // ---- API: Noticias via Google News RSS ----
    if (path === '/api/noticias') {
      try {
        const rssUrl = 'https://news.google.com/rss/search?q=Mundial+2026+OR+Copa+del+Mundo+2026+OR+FIFA+2026+OR+gol+Mundial+OR+partido+Mundial+OR+seleccion+Mundial+OR+resultado+Copa+OR+clasificacion+Mundial+OR+goleador+Mundial+OR+arbitro+Mundial+OR+cancha+Mundial+OR+estadio+Copa+OR+entrenador+Copa+OR+jugador+Mundial+OR+penalti+Copa+OR+eliminacion+Mundial+OR+octavos+Copa+OR+cuartos+Copa+OR+semifinal+Copa+OR+final+Mundial&hl=es-419&gl=US&ceid=US:es-419';
        const res = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuinielaNavo/1.0)' }
        });
        const xml = await res.text();
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
          if(items.length >= 20) break;
        }
        items.sort((a,b) => {
          const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const db2 = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return db2 - da;
        });
        const hace24h = Date.now() - 24*60*60*1000;
        const recientes = items.filter(i => i.publishedAt && new Date(i.publishedAt).getTime() > hace24h);
        const final = recientes.length >= 5 ? recientes.slice(0,10) : items.slice(0,10);
        return new Response(JSON.stringify({ articles: final }), {
          headers: { ...CORS, 'Cache-Control': 'public, max-age=300' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ articles: [], error: e.message }), { headers: CORS });
      }
    }

    // ---- Servir index.html desde GitHub ----
    try {
      const res = await fetch(HTML_URL);
      const html = await res.text();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    } catch(e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};

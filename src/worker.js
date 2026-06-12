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

// Mapa de IDs ESPN → IDs football-data.org
const ESPN_ID_MAP = {
  '760415':'537327','760416':'537328','760417':'537333','760418':'537345',
  '760419':'537334','760420':'537339','760421':'537340','760422':'537346',
  '760423':'537351','760424':'537357','760425':'537352','760426':'537358',
  '760427':'537369','760428':'537363','760429':'537370','760430':'537364',
  '760431':'537391','760432':'537392','760433':'537397','760434':'537398',
  '760435':'537403','760436':'537409','760437':'537410','760438':'537404',
  '760439':'537329','760440':'537335','760441':'537336','760442':'537330',
  '760443':'537348','760444':'537342','760445':'537341','760446':'537347',
  '760447':'537359','760448':'537353','760449':'537354','760450':'537360',
  '760451':'537371','760452':'537365','760453':'537372','760454':'537366',
  '760455':'537399','760456':'537393','760457':'537394','760458':'537400',
  '760459':'537405','760460':'537411','760461':'537412','760462':'537406',
};

// Mapa de IDs worldcup26.ir → IDs football-data.org (legacy)
const ID_MAP = {
  '1':'537327','2':'537328','3':'537333','4':'537345','5':'537334','6':'537339',
  '7':'537340','8':'537346','9':'537351','10':'537357','11':'537352','12':'537358',
  '13':'537369','14':'537363','15':'537370','16':'537364','17':'537391','18':'537392',
  '19':'537397','20':'537398','21':'537403','22':'537409','23':'537410','24':'537404',
  '25':'537329','26':'537335','27':'537336','28':'537330','29':'537348','30':'537342',
  '31':'537341','32':'537347','33':'537359','34':'537353','35':'537354','36':'537360',
  '37':'537371','38':'537365','39':'537372','40':'537366','41':'537399','42':'537393',
  '43':'537394','44':'537400','45':'537405','46':'537411','47':'537412','48':'537406',
  '49':'537337','50':'537338','51':'537344','52':'537343','53':'537331','54':'537332',
  '55':'537355','56':'537356','57':'537361','58':'537362','59':'537349','60':'537350',
  '61':'537373','62':'537367','63':'537374','64':'537368','65':'537395','66':'537401',
  '67':'537402','68':'537396','69':'537407','70':'537413','71':'537414','72':'537408',
};

// Mapa de nombres de equipos → códigos TLA y banderas
const TEAM_MAP = {
  'Mexico':{'tla':'MEX'},'South Africa':{'tla':'RSA'},'South Korea':{'tla':'KOR'},
  'Czech Republic':{'tla':'CZE'},'Canada':{'tla':'CAN'},'Bosnia and Herzegovina':{'tla':'BIH'},
  'United States':{'tla':'USA'},'Paraguay':{'tla':'PAR'},'Qatar':{'tla':'QAT'},
  'Switzerland':{'tla':'SUI'},'Brazil':{'tla':'BRA'},'Morocco':{'tla':'MAR'},
  'Haiti':{'tla':'HTI'},'Scotland':{'tla':'SCO'},'Australia':{'tla':'AUS'},
  'Turkey':{'tla':'TUR'},'Germany':{'tla':'GER'},'Curaçao':{'tla':'CUW'},
  'Netherlands':{'tla':'NED'},'Japan':{'tla':'JAP'},"Côte d'Ivoire":{'tla':'CIV'},
  'Ecuador':{'tla':'ECU'},'Argentina':{'tla':'ARG'},'Spain':{'tla':'ESP'},
  'France':{'tla':'FRA'},'England':{'tla':'ENG'},'Portugal':{'tla':'POR'},
  'Uruguay':{'tla':'URU'},'Colombia':{'tla':'COL'},'Chile':{'tla':'CHI'},
  'Peru':{'tla':'PER'},'Venezuela':{'tla':'VEN'},'Panama':{'tla':'PAN'},
  'Costa Rica':{'tla':'CRC'},'Honduras':{'tla':'HON'},'Jamaica':{'tla':'JAM'},
  'Serbia':{'tla':'SRB'},'Croatia':{'tla':'CRO'},'Poland':{'tla':'POL'},
  'Belgium':{'tla':'BEL'},'Denmark':{'tla':'DEN'},'Ukraine':{'tla':'UKR'},
  'Austria':{'tla':'AUT'},'Hungary':{'tla':'HUN'},'Romania':{'tla':'ROM'},
  'Saudi Arabia':{'tla':'SAU'},'Iran':{'tla':'IRN'},'Jordan':{'tla':'JOR'},
  'Iraq':{'tla':'IRQ'},'Uzbekistan':{'tla':'UZB'},'South Korea':{'tla':'KOR'},
  'Nigeria':{'tla':'NGA'},'Ghana':{'tla':'GHA'},'Senegal':{'tla':'SEN'},
  'Egypt':{'tla':'EGY'},'Algeria':{'tla':'ALG'},'Cameroon':{'tla':'CMR'},
  'Tunisia':{'tla':'TUN'},'New Zealand':{'tla':'NZL'},'Slovenia':{'tla':'SLO'},
  'Slovakia':{'tla':'SVK'},'Czech Republic':{'tla':'CZE'},
};

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
        // Usar worldcup26.ir — gratis, sin key, datos en vivo
        const res = await fetch('https://worldcup26.ir/get/games');
        const data = await res.json();
        const games = data.games || data;
        if(games && games.length > 0) {
          const partidos = games.map(g => {
            const finished = g.finished === 'TRUE' || g.finished === true;
            const live = g.time_elapsed === 'live' || (g.time_elapsed && g.time_elapsed !== 'notstarted' && !finished);
            let status = 'PRE';
            if(finished) status = 'FT';
            else if(live) status = 'LIVE';
            const dateStr = g.local_date || '';
            const [datePart, timePart] = dateStr.split(' ');
            const [month, day, year] = (datePart||'').split('/');
            // worldcup26.ir da hora en CR (UTC-6), convertir a UTC para formatFecha
            let fecha = year && month && day ? `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` : '';
            let horaUTC = timePart || '';
            if(timePart && fecha) {
              const dt = new Date(`${fecha}T${timePart}:00-06:00`); // CR es UTC-6
              fecha = dt.toISOString().slice(0,10);
              horaUTC = dt.toISOString().slice(11,16);
            }
            const localNom = g.home_team_name_en || 'TBD';
            const visNom = g.away_team_name_en || 'TBD';
            const localInfo = TEAM_MAP[localNom] || {};
            const visInfo = TEAM_MAP[visNom] || {};
            // Usar ID mapeado para compatibilidad con predicciones existentes
            const mappedId = ID_MAP[String(g.id)] || String(g.id);
            return {
              id: mappedId,
              local: localNom,
              visitante: visNom,
              localCod: localInfo.tla || '',
              visitanteCod: visInfo.tla || '',
              fecha,
              hora: horaUTC || '',
              fase: g.type === 'group' ? 'Fase de Grupos' : 'Eliminatorias',
              grupo: g.group ? 'Grupo ' + g.group : '',
              estadio: '',
              status,
              g1: (status === 'LIVE' || status === 'FT') && g.home_score !== null ? parseInt(g.home_score) : null,
              g2: (status === 'LIVE' || status === 'FT') && g.away_score !== null ? parseInt(g.away_score) : null,
              minuto: null,
            };
          });
          const partidosFetchedAt = new Date().toISOString();
          await Promise.all([
            kvSet(KV, 'partidos', partidos),
            kvSet(KV, 'partidosFetchedAt', partidosFetchedAt),
          ]);
          return new Response(JSON.stringify({ partidos, partidosFetchedAt }), { headers: CORS });
        }
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

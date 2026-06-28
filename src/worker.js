const FOOTBALL_KEY  = '9629fc7059cd4418a697d0d21f2eb10b';
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
  '760428':'537369','760450':'537372','760478':'537374',
  '760415':'537327',
  '760414':'537328',
  '760416':'537333',
  '760417':'537345',
  '760420':'537334',
  '760419':'537339',
  '760418':'537340',
  '760421':'537346',
  '760422':'537351',
  '760425':'537357',
  '760423':'537352',
  '760424':'537358',
  '760426':'537363',
  '760429':'537370',
  '760427':'537364',
  '760432':'537391',
  '760430':'537392',
  '760433':'537397',
  '760431':'537398',
  '760435':'537403',
  '760437':'537409',
  '760434':'537410',
  '760436':'537404',
  '760438':'537329',
  '760439':'537335',
  '760440':'537336',
  '760441':'537330',
  '760442':'537348',
  '760445':'537342',
  '760444':'537341',
  '760443':'537347',
  '760447':'537359',
  '760448':'537353',
  '760446':'537354',
  '760449':'537360',
  '760453':'537371',
  '760451':'537365',
  '760452':'537366',
  '760456':'537399',
  '760457':'537393',
  '760454':'537394',
  '760455':'537400',
  '760461':'537405',
  '760458':'537411',
  '760460':'537412',
  '760459':'537406',
  '760462':'537338',
  '760463':'537337',
  '760464':'537344',
  '760465':'537343',
  '760467':'537331',
  '760466':'537332',
  '760473':'537356',
  '760468':'537355',
  '760471':'537362',
  '760472':'537361',
  '760469':'537350',
  '760470':'537349',
  '760475':'537395',
  '760474':'537396',
  '760479':'537373',
  '760476':'537368',
  '760477':'537367',
  '760480':'537414',
  '760485':'537413',
  '760481':'537407',
  '760482':'537408',
  '760484':'537402',
  '760483':'537401'
};

// Limpia el nombre del goleador de los sufijos de ESPN ("X Goal", "X - Volley", "X Penalty - Scored", etc.)
function limpiarJugador(txt){ return (txt||'').split(' - ')[0].replace(/\s+(Goal|Penalty|Header|Volley)$/i,'').trim(); }

// Mapa de IDs ESPN → IDs football-data.org


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
  const fases = {GROUP_STAGE:'Fase de Grupos',LAST_32:'Round of 32',ROUND_OF_32:'Round of 32',LAST_16:'Octavos de Final',ROUND_OF_16:'Octavos de Final',QUARTER_FINALS:'Cuartos de Final',SEMI_FINALS:'Semifinal',THIRD_PLACE:'Tercer Lugar',FINAL:'Final'};
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
    // ---- ACTUALIZAR GOLES DE PARTIDOS FT ----
    if (path === '/api/partidos/goles') {
      try {
        let partidosKV = await kvGet(KV, 'partidos') || [];
        const sinGoles = partidosKV.filter(p => p.status === 'FT' && (!p.goles || p.goles.length === 0) && p.espnId);
        await Promise.all(sinGoles.map(async p => {
          try {
            const sr = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${p.espnId}`);
            const sd = await sr.json();
            const evts = sd.keyEvents || [];
            const idx = partidosKV.findIndex(x => x.id === p.id);
            if(idx < 0) return;
            partidosKV[idx].goles = evts
              .filter(e => e.scoringPlay || (e.shortText && e.shortText.includes('Goal')))
              .map(g => ({
                minuto: g.clock?.displayValue || '',
                jugador: limpiarJugador(g.shortText),
                local: String(g.team?.id) === String(p.homeId),
              }));
            const golL = partidosKV[idx].goles.filter(g=>g.local).length;
            const golV = partidosKV[idx].goles.filter(g=>!g.local).length;
            partidosKV[idx].g1 = Math.max(partidosKV[idx].g1||0, golL);
            partidosKV[idx].g2 = Math.max(partidosKV[idx].g2||0, golV);
            partidosKV[idx].amarillasLocal = evts.filter(e=>e.shortText?.includes('Yellow Card')&&String(e.team?.id)===String(p.homeId)).length;
            partidosKV[idx].amarillasVisita = evts.filter(e=>e.shortText?.includes('Yellow Card')&&String(e.team?.id)===String(p.awayId)).length;
            partidosKV[idx].rojasLocal = evts.filter(e=>e.shortText?.includes('Red Card')&&String(e.team?.id)===String(p.homeId)).length;
            partidosKV[idx].rojasVisita = evts.filter(e=>e.shortText?.includes('Red Card')&&String(e.team?.id)===String(p.awayId)).length;
          } catch(e) {}
        }));
        await kvSet(KV, 'partidos', partidosKV);
        return new Response(JSON.stringify({ ok: true, actualizados: sinGoles.length }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: CORS, status: 500 });
      }
    }

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
            chat = [...chat, body.mensaje].slice(-100);
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
        // Pedimos a ESPN un rango amplio en UTC (ayer → +28 días) en una sola llamada,
        // así capturamos los marcadores en vivo Y todo el cuadro de eliminatorias.
        const ymd = (d) => d.getUTCFullYear() + String(d.getUTCMonth()+1).padStart(2,'0') + String(d.getUTCDate()).padStart(2,'0');
        const baseSB = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=';
        const desde = new Date(); desde.setUTCDate(desde.getUTCDate()-1);
        const hasta = new Date(); hasta.setUTCDate(hasta.getUTCDate()+28);
        const data = await fetch(baseSB + ymd(desde) + '-' + ymd(hasta)).then(r => r.json()).catch(()=>({events:[]}));
        const events = data.events || [];
        
        // Leer partidos existentes del KV
        let partidosKV = await kvGet(KV, 'partidos') || [];
        
        if(events.length > 0) {
          // Actualizar solo los partidos de hoy con datos de ESPN
          const espnPartidos = events.map(ev => {
            const comp = ev.competitions?.[0];
            if(!comp) return null;
            const home = comp.competitors?.find(c=>c.homeAway==='home');
            const away = comp.competitors?.find(c=>c.homeAway==='away');
            const st = comp.status?.type;
            let status = 'PRE';
            if(st?.completed) status = 'FT';
            else if(st?.name === 'STATUS_HALFTIME') status = 'HT';
            else if(st?.state === 'in') status = 'LIVE';
            
            // Tarjetas rojas
            const details = comp.details || [];
            const tarjetas = details.filter(d => d.type?.text === 'Red Card' || d.type?.text === 'Yellow-Red Card');
            const rojasLocal = tarjetas.filter(d => d.team?.id === home?.team?.id).length;
            const rojasVisita = tarjetas.filter(d => d.team?.id === away?.team?.id).length;
            const dt = new Date(ev.date);
            const fecha = dt.toISOString().slice(0,10);
            const hora = dt.toISOString().slice(11,16);
            const espnId = ev.id;
            const mappedId = ESPN_ID_MAP[espnId] || espnId;
            return {
              id: mappedId,
              espnId: ev.id,
              homeId: home?.team?.id,
              awayId: away?.team?.id,
              local: home?.team?.displayName || 'TBD',
              visitante: away?.team?.displayName || 'TBD',
              localCod: home?.team?.abbreviation || '',
              visitanteCod: away?.team?.abbreviation || '',
              fecha, hora,
              fase: 'Fase de Grupos',
              grupo: '',
              estadio: comp.venue?.fullName || '',
              status,
              g1: status !== 'PRE' ? parseInt(home?.score||0) : null,
              g2: status !== 'PRE' ? parseInt(away?.score||0) : null,
              minuto: (status === 'LIVE' || status === 'HT') ? comp.status?.displayClock : null,
              rojasLocal,
              rojasVisita,
            };
          }).filter(Boolean);

          // Merge: actualizar scores de hoy, NUNCA borrar partidos existentes
          // Actualizar scores y fetch summary para goles/tarjetas
          await Promise.all(espnPartidos.map(async ep => {
            const idx = partidosKV.findIndex(p => p.id === ep.id);
            if(idx < 0) return;
            const eraFT = partidosKV[idx].status === 'FT';
            partidosKV[idx].status = ep.status;
            partidosKV[idx].espnId = ep.espnId; // necesario para el backfill de goles (/api/partidos/goles)
            if(ep.status === 'FT' && !eraFT && !partidosKV[idx].ftAt) partidosKV[idx].ftAt = Date.now();
            partidosKV[idx].g1 = ep.g1;
            partidosKV[idx].g2 = ep.g2;
            partidosKV[idx].minuto = ep.minuto;
            if(ep.status === 'LIVE' || ep.status === 'HT' || ep.status === 'FT') {
              try {
                const sr = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${ep.espnId}`);
                const sd = await sr.json();
                const evts = sd.keyEvents || [];
                partidosKV[idx].goles = evts
                  .filter(e => e.scoringPlay || (e.shortText && e.shortText.includes('Goal')))
                  .map(g => ({
                    minuto: g.clock?.displayValue || '',
                    jugador: limpiarJugador(g.shortText),
                    local: String(g.team?.id) === String(ep.homeId),
                  }));
                // El marcador del scoreboard a veces va con retraso (sobre todo en autogoles).
                // Derivamos el marcador del array de goles para que nunca quede atrás de los anotadores mostrados.
                const golL = partidosKV[idx].goles.filter(g=>g.local).length;
                const golV = partidosKV[idx].goles.filter(g=>!g.local).length;
                partidosKV[idx].g1 = Math.max(ep.g1||0, golL);
                partidosKV[idx].g2 = Math.max(ep.g2||0, golV);
                partidosKV[idx].amarillasLocal = evts.filter(e=>e.shortText?.includes('Yellow Card')&&String(e.team?.id)===String(ep.homeId)).length;
                partidosKV[idx].amarillasVisita = evts.filter(e=>e.shortText?.includes('Yellow Card')&&String(e.team?.id)===String(ep.awayId)).length;
                partidosKV[idx].rojasLocal = evts.filter(e=>e.shortText?.includes('Red Card')&&String(e.team?.id)===String(ep.homeId)).length;
                partidosKV[idx].rojasVisita = evts.filter(e=>e.shortText?.includes('Red Card')&&String(e.team?.id)===String(ep.awayId)).length;
              } catch(e) {}
            }
          }));

          // 2ª pasada: rellenar EQUIPOS de cruces de eliminatoria desde ESPN (más rápido
          // y completo que football-data), emparejando por fecha+hora (calendario oficial).
          // Se ignoran los placeholders de ESPN tipo "Group L Winner" o "Third Place...".
          const esReal = n => n && n !== 'TBD' && !/winner|loser|place|group\s|round of|semifinal|\bfinal\b|quarter|cuartos|octavos|tercer|third|runner|\btba\b|\btbd\b/i.test(n);
          espnPartidos.forEach(ep => {
            if(partidosKV.some(p => p.id === ep.id)) return; // ya emparejado por id (grupos)
            const idx = partidosKV.findIndex(p =>
              p.fase && p.fase !== 'Fase de Grupos' &&
              p.fecha === ep.fecha && (p.hora||'').slice(0,2) === (ep.hora||'').slice(0,2));
            if(idx < 0) return;
            partidosKV[idx].espnId = ep.espnId;
            // local: usar equipo real de ESPN; si ESPN trae placeholder y el actual tampoco es real, normalizar a TBD
            if(esReal(ep.local)) { partidosKV[idx].local = ep.local; partidosKV[idx].localCod = ep.localCod; partidosKV[idx].homeId = ep.homeId; }
            else if(!esReal(partidosKV[idx].local)) partidosKV[idx].local = 'TBD';
            if(esReal(ep.visitante)) { partidosKV[idx].visitante = ep.visitante; partidosKV[idx].visitanteCod = ep.visitanteCod; partidosKV[idx].awayId = ep.awayId; }
            else if(!esReal(partidosKV[idx].visitante)) partidosKV[idx].visitante = 'TBD';
            if(ep.status !== 'PRE') { partidosKV[idx].status = ep.status; partidosKV[idx].g1 = ep.g1; partidosKV[idx].g2 = ep.g2; }
          });
        }

        // Solo guardar si el KV tiene partidos (no sobreescribir con menos)
        if(partidosKV.length > 0) {
          const partidosFetchedAt = new Date().toISOString();
          await Promise.all([
            kvSet(KV, 'partidos', partidosKV),
            kvSet(KV, 'partidosFetchedAt', partidosFetchedAt),
          ]);
          return new Response(JSON.stringify({ partidos: partidosKV, partidosFetchedAt }), { headers: CORS });
        }
        return new Response(JSON.stringify({ partidos: partidosKV, fromCache: true }), { headers: CORS });
      } catch(e) {
        const partidos = await kvGet(KV, 'partidos') || [];
        return new Response(JSON.stringify({ partidos, error: e.message }), { headers: CORS });
      }
    }

    if (path === '/api/raw-matches') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/matches?season=2026`, { headers: {'X-Auth-Token':FOOTBALL_KEY} });
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: {...CORS,'Cache-Control':'public, max-age=120'} });
      } catch(e) {
        return new Response(JSON.stringify({matches:[],error:e.message}), { headers: CORS });
      }
    }

    // RESPALDO (no la usa la app): re-siembra/re-sincroniza el esqueleto de partidos
    // desde football-data. Solo para emergencia si se pierde el KV. football-data NO
    // se llama en el flujo normal — toda la data en vivo viene de ESPN.
    if (path === '/api/sync-fixtures') {
      try {
        const res = await fetch(`${FOOTBALL_BASE}/competitions/WC/matches?season=2026`, { headers: {'X-Auth-Token':FOOTBALL_KEY} });
        const data = await res.json();
        const fdMatches = data.matches || [];
        if(!fdMatches.length) return new Response(JSON.stringify({ok:false,error:'sin partidos'}), { headers: CORS });
        let partidosKV = await kvGet(KV, 'partidos') || [];
        const porId = {};
        partidosKV.forEach(p => { porId[p.id] = p; });
        let nuevos = 0, actualizados = 0;
        fdMatches.forEach(m => {
          const norm = normPartido(m);
          const ex = porId[norm.id];
          if (ex) {
            // football-data manda en el "fixture" (fase, equipos, fecha, grupo);
            // ESPN/KV manda en lo "en vivo" (status, score, goles, tarjetas...) → se preservan
            ex.fase = norm.fase;
            ex.grupo = norm.grupo;
            ex.fecha = norm.fecha;
            ex.hora = norm.hora;
            ex.estadio = norm.estadio;
            if (norm.local !== 'TBD') ex.local = norm.local;
            if (norm.visitante !== 'TBD') ex.visitante = norm.visitante;
            if (norm.localCod) ex.localCod = norm.localCod;
            if (norm.visitanteCod) ex.visitanteCod = norm.visitanteCod;
            // si el partido aún no se jugó, sincronizar también status/score desde football-data
            if (ex.status !== 'FT' && ex.status !== 'LIVE' && ex.status !== 'HT') {
              ex.status = norm.status; ex.g1 = norm.g1; ex.g2 = norm.g2;
            }
            actualizados++;
          } else {
            partidosKV.push(norm); nuevos++;
          }
        });
        await kvSet(KV, 'partidos', partidosKV);
        return new Response(JSON.stringify({ ok:true, nuevos, actualizados, total: partidosKV.length }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
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

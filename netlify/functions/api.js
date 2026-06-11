const FOOTBALL_KEY = "9ffbbd9890b24d43a0c2d5667a0bfbd9";
const JSONBIN_ID   = "6a28287ff5f4af5e29d268c7";
const JSONBIN_KEY  = "$2a$10$RpBaOrEN5kbNEXni5oWSvOTJjNCel.lsGSo1s7cqZMYQQcDcLVLQm";
const JSONBIN_URL  = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;
const FOOTBALL_URL = "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function emptyDB() {
  return { participantes:[], predicciones:[], premios:[], partidos:[], partidosFetchedAt:null };
}

async function dbRead() {
  const res = await fetch(JSONBIN_URL + "/latest", {
    headers: { "X-Master-Key": JSONBIN_KEY, "X-Bin-Meta": "false" }
  });
  if (!res.ok) throw new Error("JSONBin read: " + res.status);
  const data = await res.json();
  return { ...emptyDB(), ...data };
}

async function dbWrite(data) {
  const res = await fetch(JSONBIN_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_KEY },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("JSONBin write: " + res.status);
}

function normPartido(m) {
  const ft = (m.score||{}).fullTime||{};
  const fases = {
    GROUP_STAGE:"Fase de Grupos", ROUND_OF_32:"Round of 32",
    ROUND_OF_16:"Octavos de Final", QUARTER_FINALS:"Cuartos de Final",
    SEMI_FINALS:"Semifinal", THIRD_PLACE:"Tercer Lugar", FINAL:"Final"
  };
  const status = {SCHEDULED:"PRE",TIMED:"PRE",IN_PLAY:"LIVE",PAUSED:"HT",FINISHED:"FT",AWARDED:"FT"};
  return {
    id: String(m.id),
    local: m.homeTeam?.name||"TBD",
    visitante: m.awayTeam?.name||"TBD",
    localCod: m.homeTeam?.tla||"",
    visitanteCod: m.awayTeam?.tla||"",
    fecha: (m.utcDate||"").slice(0,10),
    hora: (m.utcDate||"").slice(11,16),
    fase: fases[m.stage]||"Fase de Grupos",
    grupo: m.group ? m.group.replace("GROUP_","Grupo "):"",
    estadio: m.venue||"",
    status: status[m.status]||"PRE",
    g1: ft.home??null,
    g2: ft.away??null,
    minuto: m.minute||null,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };

  // POST — guardar datos
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      console.log("POST received, participantes:", (body.participantes||[]).length);
      
      // Leer DB actual
      let db = emptyDB();
      try { db = await dbRead(); } catch(e) { console.error("dbRead:", e.message); }
      
      // Actualizar solo lo que viene
      if (body.participantes !== undefined) db.participantes = body.participantes;
      if (body.predicciones  !== undefined) db.predicciones  = body.predicciones;
      if (body.premios        !== undefined) db.premios       = body.premios;
      
      // Guardar en JSONBin
      await dbWrite(db);
      console.log("Saved to JSONBin OK, participantes:", db.participantes.length);
      
      return { statusCode:200, headers:CORS, body:JSON.stringify({ok:true, participantes:db.participantes.length}) };
    } catch(e) {
      console.error("POST error:", e.message);
      return { statusCode:500, headers:CORS, body:JSON.stringify({error:e.message}) };
    }
  }

  // GET — leer datos y actualizar partidos si hace >1h
  if (event.httpMethod === "GET") {
    let db = emptyDB();
    try { db = await dbRead(); } catch(e) { console.error("dbRead:", e.message); }

    const ahora = Date.now();
    const ultimoFetch = db.partidosFetchedAt ? new Date(db.partidosFetchedAt).getTime() : 0;
    
    if ((ahora - ultimoFetch) > 60*60*1000) {
      try {
        const res = await fetch(FOOTBALL_URL, { headers:{"X-Auth-Token":FOOTBALL_KEY} });
        if (res.ok) {
          const data = await res.json();
          db.partidos = (data.matches||[]).map(normPartido);
          db.partidosFetchedAt = new Date().toISOString();
          await dbWrite(db);
          console.log("Partidos actualizados:", db.partidos.length);
        }
      } catch(e) { console.error("Football API:", e.message); }
    }

    return { statusCode:200, headers:CORS, body:JSON.stringify(db) };
  }

  return { statusCode:404, headers:CORS, body:JSON.stringify({error:"Not found"}) };
};


// SILVA-DUEL - Engine de Simulación de Manejo y Ordenamiento Forestal

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep(freq, type, duration, vol = 0.1) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playClick() {
    this.playBeep(600, 'sine', 0.05, 0.1);
  }

  playAction() {
    this.playBeep(523.25, 'sine', 0.1, 0.15);
    setTimeout(() => this.playBeep(659.25, 'sine', 0.15, 0.15), 80);
  }

  playVictory() {
    this.playBeep(523.25, 'triangle', 0.15);
    setTimeout(() => this.playBeep(659.25, 'triangle', 0.15), 150);
    setTimeout(() => this.playBeep(783.99, 'triangle', 0.15), 300);
    setTimeout(() => this.playBeep(1046.50, 'triangle', 0.4), 450);
  }
}

const audio = new SoundEngine();

// --- Player Identity (shared across the 3 games via localStorage) ---
const PLAYER_NAME_KEY = "ligaForestalPlayerName";

function loadPlayerName() {
  return localStorage.getItem(PLAYER_NAME_KEY) || "";
}

function applyPlayerName(name) {
  const display = name.trim() || "Jugador";
  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  document.querySelectorAll(".user-name").forEach(el => el.textContent = display);
  document.querySelectorAll(".avatar").forEach(el => el.textContent = initials);
  document.querySelectorAll(".player-name-input").forEach(input => {
    if (input.value !== name) input.value = name;
  });
}

function initPlayerIdentity() {
  const name = loadPlayerName();
  applyPlayerName(name);
  document.querySelectorAll(".player-name-input").forEach(input => {
    input.addEventListener("input", () => {
      localStorage.setItem(PLAYER_NAME_KEY, input.value);
      applyPlayerName(input.value);
    });
  });
}

// Silva Grid Initial Seed State (16 Parcels)
const initialParcels = [
  { id: 0, species: "Pinus oocarpa", age: 15, vol: 140, status: "normal", icon: "🌲", protectedByLaw: false },
  { id: 1, species: "Pinus oocarpa", age: 20, vol: 180, status: "normal", icon: "🌲", protectedByLaw: false },
  { id: 2, species: "Franja de Río", age: 30, vol: 210, status: "protected", icon: "🏞️", protectedByLaw: true },
  { id: 3, species: "Swietenia macrophylla", age: 25, vol: 240, status: "normal", icon: "🪵", protectedByLaw: false },

  { id: 4, species: "Pinus oocarpa", age: 10, vol: 90, status: "normal", icon: "🌲", protectedByLaw: false },
  { id: 5, species: "Mezclado Latifoliado", age: 22, vol: 195, status: "normal", icon: "🍃", protectedByLaw: false },
  { id: 6, species: "Franja de Río", age: 30, vol: 220, status: "protected", icon: "🏞️", protectedByLaw: true },
  { id: 7, species: "Pinus oocarpa", age: 18, vol: 160, status: "normal", icon: "🌲", protectedByLaw: false },

  { id: 8, species: "Cedrela odorata", age: 20, vol: 175, status: "normal", icon: "🪵", protectedByLaw: false },
  { id: 9, species: "Pinus oocarpa", age: 12, vol: 110, status: "normal", icon: "🌲", protectedByLaw: false },
  { id: 10, species: "Mezclado Latifoliado", age: 28, vol: 230, status: "normal", icon: "🍃", protectedByLaw: false },
  { id: 11, species: "Swietenia macrophylla", age: 15, vol: 150, status: "normal", icon: "🪵", protectedByLaw: false },

  { id: 12, species: "Pinus oocarpa", age: 8, vol: 70, status: "normal", icon: "🌱", protectedByLaw: false },
  { id: 13, species: "Pinus oocarpa", age: 25, vol: 220, status: "normal", icon: "🌲", protectedByLaw: false },
  { id: 14, species: "Pinus oocarpa", age: 20, vol: 170, status: "normal", icon: "🌲", protectedByLaw: false },
  { id: 15, species: "Pinus oocarpa", age: 15, vol: 135, status: "normal", icon: "🌲", protectedByLaw: false }
];

// Duel State
let duelState = {
  turn: 1,
  maxTurns: 4,
  currentYear: 2026,
  parcels: JSON.parse(JSON.stringify(initialParcels)),
  selectedParcelId: null,
  myVAN: 0,
  mySustainability: 100,
  myCO2: 120.0
};

// --- Mission Timer (Contra Reloj) ---
const SILVA_BEST_KEY = "silvaDuelRecords";
const DUEL_TIME_LIMIT = 180; // 3 minutes total to plan all 4 turns
let duelTimeLeft = DUEL_TIME_LIMIT;
let duelTimerInterval = null;

function loadSilvaRecords() {
  try {
    const raw = localStorage.getItem(SILVA_BEST_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { bestScore: 0, plays: 0 };
}

function saveSilvaRecords(records) {
  localStorage.setItem(SILVA_BEST_KEY, JSON.stringify(records));
}

let silvaRecords = loadSilvaRecords();

function refreshSilvaBadge() {
  document.getElementById("user-elo-val").textContent = silvaRecords.bestScore.toLocaleString('en-US');
  document.getElementById("silva-best-badge").textContent = `Récord: ${silvaRecords.bestScore.toLocaleString('en-US')} pts`;
}

function formatDuelTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startDuelTimer() {
  duelTimeLeft = DUEL_TIME_LIMIT;
  clearInterval(duelTimerInterval);
  const timerEl = document.getElementById("duel-timer");
  timerEl.textContent = formatDuelTime(duelTimeLeft);

  duelTimerInterval = setInterval(() => {
    duelTimeLeft--;
    timerEl.textContent = formatDuelTime(Math.max(0, duelTimeLeft));

    if (duelTimeLeft <= 0) {
      clearInterval(duelTimerInterval);
      endDuel();
    }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  initPlayerIdentity();
  setupLobby();
  setupActionButtons();
  setupTurnAdvancement();
  refreshSilvaBadge();
});

function setupLobby() {
  document.getElementById("btn-start-duel").addEventListener("click", () => {
    audio.playClick();
    document.getElementById("lobby-screen").classList.add("hidden");
    document.getElementById("duel-gameplay-screen").classList.remove("hidden");
    startDuel();
  });

  document.getElementById("btn-duel-again").addEventListener("click", () => {
    document.getElementById("duel-results-screen").classList.add("hidden");
    document.getElementById("lobby-screen").classList.remove("hidden");
    refreshSilvaBadge();
  });
}

function startDuel() {
  duelState.turn = 1;
  duelState.currentYear = 2026;
  duelState.parcels = JSON.parse(JSON.stringify(initialParcels));
  duelState.selectedParcelId = null;
  duelState.myVAN = 0;
  duelState.mySustainability = 100;
  duelState.myCO2 = 120.0;

  renderForestGrid();
  updateMetricsHUD();
  startDuelTimer();
}

function renderForestGrid() {
  const gridEl = document.getElementById("forest-grid");
  gridEl.innerHTML = "";

  duelState.parcels.forEach(p => {
    const cell = document.createElement("div");
    cell.className = `parcel-cell ${duelState.selectedParcelId === p.id ? 'selected' : ''}`;
    
    let tagHTML = "";
    if (p.status === "protected") tagHTML = `<span class="parcel-status-tag tag-protected">RES</span>`;
    if (p.status === "harvested") tagHTML = `<span class="parcel-status-tag tag-harvested">COR</span>`;
    if (p.status === "thinned") tagHTML = `<span class="parcel-status-tag tag-thinned">RAL</span>`;

    cell.innerHTML = `
      ${tagHTML}
      <div class="parcel-icon">${p.icon}</div>
      <div class="parcel-label">${p.species.split(" ")[0]}</div>
      <div class="parcel-vol">${p.vol} m³</div>
    `;

    cell.addEventListener("click", () => selectParcel(p.id));
    gridEl.appendChild(cell);
  });
}

function selectParcel(id) {
  audio.playClick();
  duelState.selectedParcelId = id;
  renderForestGrid();

  const parcel = duelState.parcels[id];
  const infoEl = document.getElementById("selected-parcel-info");
  const titleEl = document.getElementById("action-panel-title");
  const descEl = document.getElementById("action-panel-desc");

  infoEl.textContent = `P#${id + 1}: ${parcel.species} (${parcel.vol} m³)`;
  titleEl.textContent = `Tratamiento para Parcela #${id + 1} (${parcel.species})`;
  descEl.textContent = `Edad: ${parcel.age} años | Vol: ${parcel.vol} m³/ha | Estado: ${parcel.status.toUpperCase()}`;

  // Enable/Disable Buttons based on parcel status
  const btnThin = document.getElementById("act-thin");
  const btnHarvest = document.getElementById("act-harvest");
  const btnReforest = document.getElementById("act-reforest");
  const btnProtect = document.getElementById("act-protect");

  if (parcel.protectedByLaw) {
    btnThin.disabled = true;
    btnHarvest.disabled = true;
    btnReforest.disabled = true;
    btnProtect.disabled = true;
    descEl.textContent += " — ⛔ FR ANJA PROTEGIDA POR LEY (PROHIBIDO TACHADO/CORTA)";
    return;
  }

  btnThin.disabled = (parcel.status === "harvested" || parcel.status === "protected" || parcel.status === "thinned");
  btnHarvest.disabled = (parcel.status === "harvested" || parcel.status === "protected");
  btnReforest.disabled = (parcel.status !== "harvested");
  btnProtect.disabled = (parcel.status !== "normal");
}

function setupActionButtons() {
  document.getElementById("act-thin").addEventListener("click", () => {
    if (duelState.selectedParcelId === null) return;
    const p = duelState.parcels[duelState.selectedParcelId];
    p.status = "thinned";
    p.vol = Math.floor(p.vol * 0.7);
    duelState.myVAN += 1200;
    audio.playAction();
    selectParcel(p.id);
    updateMetricsHUD();
  });

  document.getElementById("act-harvest").addEventListener("click", () => {
    if (duelState.selectedParcelId === null) return;
    const p = duelState.parcels[duelState.selectedParcelId];
    p.status = "harvested";
    p.icon = "🪵";
    duelState.myVAN += (p.vol * 22); // $22 per m3
    p.vol = 0;
    duelState.mySustainability = Math.max(40, duelState.mySustainability - 8.5);
    audio.playAction();
    selectParcel(p.id);
    updateMetricsHUD();
  });

  document.getElementById("act-reforest").addEventListener("click", () => {
    if (duelState.selectedParcelId === null) return;
    const p = duelState.parcels[duelState.selectedParcelId];
    p.status = "normal";
    p.species = "Pinus oocarpa (Plantación)";
    p.icon = "🌱";
    p.vol = 25;
    p.age = 1;
    duelState.myVAN -= 800;
    duelState.mySustainability = Math.min(100, duelState.mySustainability + 6.0);
    audio.playAction();
    selectParcel(p.id);
    updateMetricsHUD();
  });

  document.getElementById("act-protect").addEventListener("click", () => {
    if (duelState.selectedParcelId === null) return;
    const p = duelState.parcels[duelState.selectedParcelId];
    p.status = "protected";
    duelState.mySustainability = Math.min(100, duelState.mySustainability + 10.0);
    audio.playAction();
    selectParcel(p.id);
    updateMetricsHUD();
  });
}

function updateMetricsHUD() {
  document.getElementById("my-van").textContent = `$${duelState.myVAN.toLocaleString('en-US')}.00`;
  document.getElementById("my-sost").textContent = `${duelState.mySustainability.toFixed(1)}%`;
  
  // Calculate total CO2
  let totalVol = duelState.parcels.reduce((acc, p) => acc + p.vol, 0);
  duelState.myCO2 = (totalVol * 0.85).toFixed(1);
  document.getElementById("my-co2").textContent = `${duelState.myCO2} t`;

  renderForestGrid();
}

function setupTurnAdvancement() {
  document.getElementById("btn-next-turn").addEventListener("click", () => {
    if (duelTimeLeft <= 0) return;
    audio.playClick();
    duelState.turn++;
    duelState.currentYear += 5;

    if (duelState.turn > duelState.maxTurns) {
      endDuel();
      return;
    }

    // Grow all trees for 5 years
    duelState.parcels.forEach(p => {
      if (p.status !== "harvested") {
        p.age += 5;
        p.vol += Math.floor(Math.random() * 25 + 20); // Natural growth
        if (p.age > 10 && p.icon === "🌱") p.icon = "🌲";
      }
    });

    document.getElementById("current-year-display").textContent = `AÑO ${duelState.currentYear} (Turno ${duelState.turn}/4)`;
    updateMetricsHUD();
  });
}

function endDuel() {
  if (document.getElementById("duel-results-screen").classList.contains("hidden") === false) return;
  clearInterval(duelTimerInterval);

  document.getElementById("duel-gameplay-screen").classList.add("hidden");
  document.getElementById("duel-results-screen").classList.remove("hidden");

  const scoreMy = Math.round((duelState.myVAN * 0.5) + (duelState.mySustainability * 150));
  const prevBest = silvaRecords.bestScore;
  const isNewRecord = scoreMy > prevBest;
  const ranOutOfTime = duelTimeLeft <= 0 && duelState.turn <= duelState.maxTurns;

  if (isNewRecord) {
    audio.playVictory();
    document.getElementById("duel-trophy").textContent = "🏆";
    document.getElementById("duel-result-title").textContent = "¡NUEVO RÉCORD PERSONAL!";
    document.getElementById("duel-result-subtitle").textContent = "Superaste tu mejor balance de VAN ($) y Sostenibilidad Ambiental.";
  } else if (ranOutOfTime) {
    document.getElementById("duel-trophy").textContent = "⏱️";
    document.getElementById("duel-result-title").textContent = "¡TIEMPO AGOTADO!";
    document.getElementById("duel-result-subtitle").textContent = "Se acabaron los 3 minutos antes de completar los 4 turnos.";
  } else {
    document.getElementById("duel-trophy").textContent = "🥈";
    document.getElementById("duel-result-title").textContent = "RETO COMPLETADO";
    document.getElementById("duel-result-subtitle").textContent = "Buen plan de manejo. Intentá superar tu récord la próxima vez.";
  }

  silvaRecords.bestScore = Math.max(prevBest, scoreMy);
  silvaRecords.plays += 1;
  saveSilvaRecords(silvaRecords);
  refreshSilvaBadge();

  document.getElementById("res-my-van").textContent = `$${duelState.myVAN.toLocaleString('en-US')}.00`;
  document.getElementById("res-opp-van").textContent = `${prevBest.toLocaleString('en-US')} pts`;
  document.getElementById("res-my-sost").textContent = `${duelState.mySustainability.toFixed(1)}%`;
  document.getElementById("res-new-elo").textContent = silvaRecords.bestScore.toLocaleString('en-US');
}

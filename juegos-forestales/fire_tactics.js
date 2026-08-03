// FIRE-TACTICS - Interactive Wildfire Engine (Ultra-Responsive & Controllable)

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

  playWater() {
    this.playBeep(400, 'sine', 0.1, 0.15);
  }

  playDozer() {
    this.playBeep(140, 'sawtooth', 0.15, 0.2);
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

// Grid Dimensions
const COLS = 52;
const ROWS = 32;
const CELL_SIZE = 10;

// Cell Types
const FUEL = 0;       // Forest (Green)
const FIRE = 1;       // Burning (Red/Orange)
const BURNED = 2;     // Ash (Grey)
const FIREBREAK = 3;  // Dug line (Brown)
const DOZER = 4;      // Dozer trench (Dark Brown)
const RETARDANT = 5;  // Water/Extinguished (Neon Blue)

let grid = [];
let animId = null;
let currentTool = "line";
let budget = 10000;
let initialFuelCount = 0;
let isDrawing = false;
let isPaused = false;
let simSpeed = 8; // Frames per fire tick (higher = slower fire spread)
let frameCounter = 0;

// --- Mission Timer (Contra Reloj) ---
const FIRE_BEST_KEY = "fireTacticsBestTime";
let missionStartTime = 0;
let missionElapsed = 0;
let missionTimerInterval = null;

function getBestTime() {
  const v = localStorage.getItem(FIRE_BEST_KEY);
  return v ? parseFloat(v) : null;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function refreshBestBadge() {
  const best = getBestTime();
  document.getElementById("fire-best-badge").textContent = best !== null
    ? `Mejor tiempo: ${formatTime(best)}`
    : "Mejor tiempo: --:--";
  document.getElementById("header-best-time").textContent = best !== null ? formatTime(best) : "--:--";
}

function startMissionTimer() {
  missionStartTime = performance.now();
  clearInterval(missionTimerInterval);
  missionTimerInterval = setInterval(() => {
    missionElapsed = (performance.now() - missionStartTime) / 1000;
    document.getElementById("mission-timer").textContent = formatTime(missionElapsed);
  }, 100);
}

// --- Visual Juice: Particles & Screen Shake ---
let particles = [];
let shakeMag = 0;

function spawnParticles(x, y, kind, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = kind === "splash" ? 1.5 + Math.random() * 2 : 0.4 + Math.random() * 1.2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === "smoke" ? 0.6 : 0),
      life: 1,
      decay: kind === "smoke" ? 0.015 : 0.04,
      size: kind === "dust" ? 2 + Math.random() * 2 : 1.5 + Math.random() * 2,
      kind
    });
  }
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.kind === "smoke") p.vy -= 0.01; // rises and accelerates upward
    p.life -= p.decay;
  });
  particles = particles.filter(p => p.life > 0);
}

function drawParticles(ctx) {
  particles.forEach(p => {
    let color = "rgba(200,200,200,";
    if (p.kind === "spark") color = "rgba(255,180,60,";
    else if (p.kind === "splash") color = "rgba(0,229,255,";
    else if (p.kind === "dust") color = "rgba(161,136,127,";
    else if (p.kind === "smoke") color = "rgba(90,90,90,";
    ctx.fillStyle = color + Math.max(0, p.life) + ")";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function triggerShake(mag) {
  shakeMag = mag;
}

document.addEventListener("DOMContentLoaded", () => {
  initPlayerIdentity();
  setupLobby();
  setupTools();
  setupSpeedControls();
  refreshBestBadge();
});

function setupLobby() {
  document.getElementById("btn-start-fire-game").addEventListener("click", () => {
    audio.playWater();
    document.getElementById("fire-lobby").classList.add("hidden");
    document.getElementById("fire-gameplay").classList.remove("hidden");
    initFireSim();
  });

  document.getElementById("btn-fire-again").addEventListener("click", () => {
    document.getElementById("fire-results").classList.add("hidden");
    document.getElementById("fire-lobby").classList.remove("hidden");
    refreshBestBadge();
  });
}

function setupTools() {
  const toolBtns = document.querySelectorAll(".tactical-btn");
  toolBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      toolBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTool = btn.getAttribute("data-tool");
    });
  });

  const canvas = document.getElementById("fireCanvas");

  // Pointer & Touch events for flawless drawing
  canvas.addEventListener("pointerdown", (e) => {
    isDrawing = true;
    handlePointerInput(e);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (isDrawing) handlePointerInput(e);
  });

  window.addEventListener("pointerup", () => { isDrawing = false; });
  window.addEventListener("pointercancel", () => { isDrawing = false; });
}

function setupSpeedControls() {
  const btnPause = document.getElementById("btn-pause");
  const btnNormal = document.getElementById("btn-speed-normal");
  const btnFast = document.getElementById("btn-speed-fast");

  btnPause.addEventListener("click", () => {
    isPaused = true;
    btnPause.classList.add("active");
    btnNormal.classList.remove("active");
    btnFast.classList.remove("active");
  });

  btnNormal.addEventListener("click", () => {
    isPaused = false;
    simSpeed = 8; // Normal readable pace
    btnPause.classList.remove("active");
    btnNormal.classList.add("active");
    btnFast.classList.remove("active");
  });

  btnFast.addEventListener("click", () => {
    isPaused = false;
    simSpeed = 3; // Fast pace
    btnPause.classList.remove("active");
    btnNormal.classList.remove("active");
    btnFast.classList.add("active");
  });
}

function initFireSim() {
  budget = 10000;
  grid = [];
  initialFuelCount = 0;
  isPaused = false;
  simSpeed = 8;

  // Fill Grid with Fuel
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = FUEL;
      initialFuelCount++;
    }
  }

  // Initial Fire Origin (Single Small Ignition in Left-Center)
  const startR = Math.floor(ROWS / 2);
  const startC = 8;
  grid[startR][startC] = FIRE;
  grid[startR + 1][startC] = FIRE;

  updateHUD();
  startMissionTimer();

  if (animId) cancelAnimationFrame(animId);
  gameLoop();
}

function handlePointerInput(e) {
  const canvas = document.getElementById("fireCanvas");
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const c = Math.floor(clickX / CELL_SIZE);
  const r = Math.floor(clickY / CELL_SIZE);

  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

  const px = (c + 0.5) * CELL_SIZE;
  const py = (r + 0.5) * CELL_SIZE;

  if (currentTool === "line" && budget >= 500) {
    applyBrush(r, c, 1, FIREBREAK);
    budget -= 500;
    audio.playDozer();
    spawnParticles(px, py, "dust", 4);
  } else if (currentTool === "dozer" && budget >= 1500) {
    applyBrush(r, c, 2, DOZER);
    budget -= 1500;
    audio.playDozer();
    spawnParticles(px, py, "dust", 8);
  } else if (currentTool === "air" && budget >= 2000) {
    applyBrush(r, c, 4, RETARDANT);
    budget -= 2000;
    audio.playWater();
    spawnParticles(px, py, "splash", 14);
    triggerShake(4);
  } else if (currentTool === "backfire" && budget >= 800) {
    applyBrush(r, c, 1, FIRE);
    budget -= 800;
    audio.playWater();
    spawnParticles(px, py, "spark", 6);
  } else {
    flashInsufficientFunds();
    return;
  }

  updateHUD();
  drawCanvas(); // Immediate visual render!
}

function flashInsufficientFunds() {
  const budgetEl = document.getElementById("budget-val");
  budgetEl.classList.add("budget-flash");
  setTimeout(() => budgetEl.classList.remove("budget-flash"), 250);
}

function applyBrush(r, c, radius, type) {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr * dr + dc * dc <= radius * radius) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (type === RETARDANT) {
            // Extinguishes fire or protects fuel
            if (grid[nr][nc] === FIRE || grid[nr][nc] === FUEL) {
              grid[nr][nc] = RETARDANT;
            }
          } else if (type === FIRE) {
            if (grid[nr][nc] === FUEL) grid[nr][nc] = FIRE;
          } else {
            // FIREBREAK or DOZER stops fire
            grid[nr][nc] = type;
          }
        }
      }
    }
  }
}

function updateHUD() {
  document.getElementById("budget-val").textContent = `$${Math.max(0, budget).toLocaleString('en-US')}`;
}

function gameLoop() {
  frameCounter++;

  if (!isPaused && frameCounter % simSpeed === 0) {
    updatePhysics();
    spawnAmbientSmoke();
  }

  updateParticles();
  drawCanvas();

  const fireCount = countCells(FIRE);
  const fuelCount = countCells(FUEL);
  const savedPct = ((fuelCount / initialFuelCount) * 100).toFixed(1);
  document.getElementById("saved-pct").textContent = `${savedPct}%`;

  if (fireCount === 0 && frameCounter > 30) {
    endGame(true, savedPct);
    return;
  }

  animId = requestAnimationFrame(gameLoop);
}

function countCells(type) {
  let count = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === type) count++;
    }
  }
  return count;
}

function updatePhysics() {
  const nextGrid = grid.map(row => [...row]);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === FIRE) {
        // Ash probability
        if (Math.random() < 0.12) {
          nextGrid[r][c] = BURNED;
        }

        // Fire spreads towards East/Northeast due to Wind
        const neighbors = [
          { r: r - 1, c: c, prob: 0.08 },      // Up
          { r: r + 1, c: c, prob: 0.04 },      // Down
          { r: r, c: c + 1, prob: 0.30 },      // Right (Main Wind Vector)
          { r: r - 1, c: c + 1, prob: 0.20 },  // Up-Right
          { r: r, c: c - 1, prob: 0.01 }       // Left
        ];

        neighbors.forEach(n => {
          if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
            // FIRE CANNOT CROSS FIREBREAK, DOZER, OR RETARDANT!
            if (grid[n.r][n.c] === FUEL && Math.random() < n.prob) {
              nextGrid[n.r][n.c] = FIRE;
            }
          }
        });
      }
    }
  }

  grid = nextGrid;
}

function spawnAmbientSmoke() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === FIRE && Math.random() < 0.35) {
        spawnParticles((c + 0.5) * CELL_SIZE, (r + 0.5) * CELL_SIZE, "smoke", 1);
      }
    }
  }
}

function drawCanvas() {
  const canvas = document.getElementById("fireCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  if (shakeMag > 0.1) {
    const dx = (Math.random() - 0.5) * shakeMag;
    const dy = (Math.random() - 0.5) * shakeMag;
    ctx.translate(dx, dy);
    shakeMag *= 0.85;
  } else {
    shakeMag = 0;
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const type = grid[r][c];
      let color = "#1B2E21"; // Forest fuel green
      let glow = false;

      if (type === FIRE) {
        color = Math.random() < 0.5 ? "#FF3D00" : "#FFD700"; // Fire active
        glow = true;
      } else if (type === BURNED) {
        color = "#262626"; // Ash
      } else if (type === FIREBREAK) {
        color = "#A1887F"; // Hand line brown
      } else if (type === DOZER) {
        color = "#5D4037"; // Dozer thick trench
      } else if (type === RETARDANT) {
        color = "#00E5FF"; // Retardant neon blue
      }

      if (glow) {
        ctx.shadowColor = "#FF6D00";
        ctx.shadowBlur = 6;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE - 0.5, CELL_SIZE - 0.5);
    }
  }

  ctx.shadowBlur = 0;
  drawParticles(ctx);
  ctx.restore();
}

function endGame(success, savedPct) {
  cancelAnimationFrame(animId);
  clearInterval(missionTimerInterval);
  audio.playVictory();

  document.getElementById("fire-gameplay").classList.add("hidden");
  document.getElementById("fire-results").classList.remove("hidden");

  const prevBest = getBestTime();
  const isNewRecord = prevBest === null || missionElapsed < prevBest;
  if (isNewRecord) {
    localStorage.setItem(FIRE_BEST_KEY, missionElapsed.toString());
  }

  document.getElementById("fire-result-title").textContent = isNewRecord
    ? "¡NUEVO RÉCORD DE TIEMPO!"
    : "¡INCENDIO CONTENIDO!";
  document.getElementById("fire-result-subtitle").textContent = isNewRecord
    ? "Contuviste el incendio más rápido que nunca."
    : "Has logrado sofocar el frente de avance con éxito.";

  document.getElementById("res-saved").textContent = `${savedPct}%`;
  document.getElementById("res-time").textContent = formatTime(missionElapsed);
  document.getElementById("res-budget").textContent = `$${Math.max(0, budget).toLocaleString('en-US')}`;
  document.getElementById("res-best-time").textContent = formatTime(isNewRecord ? missionElapsed : prevBest);

  refreshBestBadge();
}

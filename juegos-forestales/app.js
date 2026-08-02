// DENDRO-SPEED ARENA - Reto Contra Reloj (Sin Rivales, Solo Récords Personales)

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

  playCorrect() {
    this.playBeep(523.25, 'sine', 0.1, 0.15);
    setTimeout(() => this.playBeep(659.25, 'sine', 0.15, 0.15), 80);
    setTimeout(() => this.playBeep(783.99, 'sine', 0.25, 0.2), 160);
  }

  playWrong() {
    this.playBeep(220, 'sawtooth', 0.2, 0.2);
    setTimeout(() => this.playBeep(174.61, 'sawtooth', 0.3, 0.2), 150);
  }

  playTick() {
    this.playBeep(800, 'square', 0.03, 0.05);
  }

  playVictory() {
    this.playBeep(523.25, 'triangle', 0.15);
    setTimeout(() => this.playBeep(659.25, 'triangle', 0.15), 150);
    setTimeout(() => this.playBeep(783.99, 'triangle', 0.15), 300);
    setTimeout(() => this.playBeep(1046.50, 'triangle', 0.4), 450);
  }
}

const audio = new SoundEngine();

// ULTRA-SHORT TEXT CHALLENGES
const ultraShortChallenges = [
  () => ({
    category: "INSTRUMENTAL",
    diffPoints: 200,
    question: "¿Qué instrumento mide el Área Basal (G/ha) por conteo angular?",
    formulaHint: "Conteo angular de Bitterlich",
    visualHTML: `<div style="font-size:3.5rem; text-align:center;">🔭</div>`,
    correct: "Relascopio de Bitterlich",
    options: ["Relascopio de Bitterlich", "Cinta Diamétrica", "Hipsómetro Suunto", "Barrena de Pressler"]
  }),
  () => ({
    category: "BIOMETRÍA",
    diffPoints: 250,
    question: "Si el DAP se duplica, ¿cuánto aumenta el Área Basal?",
    formulaHint: "Relación g ∝ d²",
    visualHTML: `<div style="font-size:2.8rem; text-align:center;">🔴 ➔ 🔴🔴🔴🔴</div>`,
    correct: "Se cuadruplica (4x)",
    options: ["Se cuadruplica (4x)", "Se duplica (2x)", "Se triplica (3x)", "Permanece igual"]
  }),
  () => ({
    category: "SILVICULTURA",
    diffPoints: 300,
    question: "¿Tratamiento para liberar espacio en rodales muy densos?",
    formulaHint: "Eliminación de competidores inferiores",
    visualHTML: `<div style="font-size:2.8rem; text-align:center;">🌲🌲🌲 ➔ 🌲 &nbsp; 🌲</div>`,
    correct: "Raleo por abajo",
    options: ["Raleo por abajo", "Corta a hecho total", "Podas de copa", "Quema prescrita"]
  }),
  () => ({
    category: "DENDROLOGÍA",
    diffPoints: 200,
    question: "¿Pino neotropical con 5 acículas por fascículo?",
    formulaHint: "Fascículo de 5 agujas",
    visualHTML: `<div style="font-size:3rem; text-align:center;">🌿✋</div>`,
    correct: "Pinus pseudostrobus",
    options: ["Pinus pseudostrobus", "Pinus oocarpa", "Pinus caribaea", "Cedrela odorata"]
  }),
  () => ({
    category: "PROTECCIÓN",
    diffPoints: 250,
    question: "¿Función principal del bosque a orillas de los ríos?",
    formulaHint: "Protección de cauce y suelos",
    visualHTML: `<div style="font-size:3rem; text-align:center;">🏞️🌲</div>`,
    correct: "Retener sedimentos",
    options: ["Retener sedimentos", "Calentar el agua", "Acelerar erosión", "Extraer madera"]
  })
];

// --- Personal Records (localStorage, no opponents) ---
const RECORDS_KEY = "dendroSpeedRecords";

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    sprint: { best: 0, bestAccuracy: 0, plays: 0 },
    marathon: { best: 0, bestAccuracy: 0, plays: 0 }
  };
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

let records = loadRecords();

function refreshRecordBadges() {
  document.getElementById("user-elo-val").textContent = Math.max(records.sprint.best, records.marathon.best).toLocaleString('en-US');
  document.getElementById("sprint-best-badge").textContent = `Récord: ${records.sprint.best.toLocaleString('en-US')} pts`;
  document.getElementById("marathon-best-badge").textContent = `Récord: ${records.marathon.best.toLocaleString('en-US')} pts`;
  document.getElementById("records-sprint-score").textContent = `${records.sprint.best.toLocaleString('en-US')} pts`;
  document.getElementById("records-sprint-accuracy").textContent = `${records.sprint.bestAccuracy.toFixed(1)}%`;
  document.getElementById("records-sprint-plays").textContent = records.sprint.plays;
  document.getElementById("records-marathon-score").textContent = `${records.marathon.best.toLocaleString('en-US')} pts`;
  document.getElementById("records-marathon-accuracy").textContent = `${records.marathon.bestAccuracy.toFixed(1)}%`;
  document.getElementById("records-marathon-plays").textContent = records.marathon.plays;
}

// --- Sprint Mode State (5 rounds x 15s) ---
let appState = {
  round: 1,
  maxRounds: 5,
  myScore: 0,
  timerInterval: null,
  maxTime: 15.0,
  timeLeft: 15.0,
  currentProblem: null,
  breakdown: []
};

// --- Marathon Mode State (60s continuous) ---
let marathonState = {
  active: false,
  score: 0,
  answered: 0,
  correct: 0,
  timeLeft: 60.0,
  timerInterval: null,
  currentProblem: null
};

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupSprintMode();
  setupMarathonMode();
  refreshRecordBadges();
});

function setupNavigation() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetId = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.remove("active");
        if (content.id === targetId) {
          content.classList.add("active");
        }
      });
    });
  });
}

// ============ SPRINT MODE (5 rounds x 15s) ============

function setupSprintMode() {
  const btnStart = document.getElementById("btn-start-match");
  const matchmakingScreen = document.getElementById("matchmaking-screen");
  const gameplayScreen = document.getElementById("gameplay-screen");
  const resultsScreen = document.getElementById("results-screen");

  btnStart.addEventListener("click", () => {
    audio.playTick();
    matchmakingScreen.classList.add("hidden");
    gameplayScreen.classList.remove("hidden");
    resultsScreen.classList.add("hidden");
    startSprint();
  });

  document.getElementById("btn-play-again").addEventListener("click", () => {
    resultsScreen.classList.add("hidden");
    matchmakingScreen.classList.remove("hidden");
    refreshRecordBadges();
  });

  document.getElementById("btn-view-leaderboard").addEventListener("click", () => {
    document.querySelector('[data-tab="leaderboard-tab"]').click();
  });
}

function startSprint() {
  appState.round = 1;
  appState.myScore = 0;
  appState.breakdown = [];

  updateSprintHUD();
  loadSprintRound();
}

function updateSprintHUD() {
  document.getElementById("my-score").textContent = `${appState.myScore.toLocaleString('en-US')} pts`;
  document.getElementById("opp-score").textContent = `${records.sprint.best.toLocaleString('en-US')} pts`;
  document.getElementById("round-num").textContent = `Ronda ${appState.round}/${appState.maxRounds}`;
}

function loadSprintRound() {
  if (appState.round > appState.maxRounds) {
    endSprint();
    return;
  }

  updateSprintHUD();
  const challengeGen = ultraShortChallenges[(appState.round - 1) % ultraShortChallenges.length];
  const problem = challengeGen();
  appState.currentProblem = problem;

  document.getElementById("problem-category").textContent = problem.category;
  document.getElementById("problem-diff").textContent = `+${problem.diffPoints} PTS`;
  document.getElementById("problem-question").textContent = problem.question;
  document.getElementById("problem-formula-hint").textContent = problem.formulaHint;
  document.getElementById("problem-visual").innerHTML = problem.visualHTML;

  const optionsGrid = document.getElementById("options-grid");
  optionsGrid.innerHTML = "";

  problem.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleSprintAnswer(opt, btn));
    optionsGrid.appendChild(btn);
  });

  startSprintTimer();
}

function startSprintTimer() {
  clearInterval(appState.timerInterval);
  appState.timeLeft = 15.0;
  const timerCircle = document.getElementById("timer-circle");
  const timerText = document.getElementById("match-timer");
  const fill = document.getElementById("timer-progress-fill");

  appState.timerInterval = setInterval(() => {
    appState.timeLeft -= 0.1;
    if (appState.timeLeft <= 0) {
      appState.timeLeft = 0;
      clearInterval(appState.timerInterval);
      handleSprintTimeOut();
    }

    timerText.textContent = appState.timeLeft.toFixed(1);
    const pct = (appState.timeLeft / 15.0) * 100;
    fill.style.width = `${pct}%`;

    if (appState.timeLeft <= 5.0) {
      audio.playTick();
      timerCircle.style.borderColor = "var(--danger-red)";
    } else {
      timerCircle.style.borderColor = "var(--accent-gold)";
    }
  }, 100);
}

function handleSprintAnswer(selectedOpt, btnElement) {
  clearInterval(appState.timerInterval);

  const problem = appState.currentProblem;
  const isCorrect = (selectedOpt === problem.correct);
  const timeBonus = Math.floor(appState.timeLeft * 8);

  const allBtns = document.querySelectorAll("#options-grid .option-btn");
  allBtns.forEach(b => b.disabled = true);

  if (isCorrect) {
    btnElement.classList.add("correct");
    audio.playCorrect();
    const gained = problem.diffPoints + timeBonus;
    appState.myScore += gained;

    appState.breakdown.push({
      round: appState.round,
      status: "CORRECTO",
      time: (15.0 - appState.timeLeft).toFixed(1),
      pts: gained
    });
  } else {
    btnElement.classList.add("wrong");
    audio.playWrong();
    allBtns.forEach(b => {
      if (b.textContent === problem.correct) b.classList.add("correct");
    });

    appState.breakdown.push({
      round: appState.round,
      status: "INCORRECTO",
      time: (15.0 - appState.timeLeft).toFixed(1),
      pts: 0
    });
  }

  updateSprintHUD();

  setTimeout(() => {
    appState.round++;
    loadSprintRound();
  }, 1300);
}

function handleSprintTimeOut() {
  audio.playWrong();
  const problem = appState.currentProblem;
  const allBtns = document.querySelectorAll("#options-grid .option-btn");
  allBtns.forEach(b => {
    b.disabled = true;
    if (b.textContent === problem.correct) b.classList.add("correct");
  });

  appState.breakdown.push({
    round: appState.round,
    status: "AGOTADO",
    time: "15.0",
    pts: 0
  });

  updateSprintHUD();

  setTimeout(() => {
    appState.round++;
    loadSprintRound();
  }, 1300);
}

function endSprint() {
  clearInterval(appState.timerInterval);

  document.getElementById("gameplay-screen").classList.add("hidden");
  const resultsScreen = document.getElementById("results-screen");
  resultsScreen.classList.remove("hidden");

  const correctCount = appState.breakdown.filter(b => b.status === "CORRECTO").length;
  const accuracy = (correctCount / appState.maxRounds) * 100;
  const prevBest = records.sprint.best;
  const isNewRecord = appState.myScore > prevBest;

  if (isNewRecord) {
    audio.playVictory();
    document.getElementById("result-trophy").textContent = "🏆";
    document.getElementById("result-title").textContent = "¡NUEVO RÉCORD PERSONAL!";
    document.getElementById("result-subtitle").textContent = "Superaste tu mejor marca de agilidad visual y criterio forestal.";
  } else {
    document.getElementById("result-trophy").textContent = "⏱️";
    document.getElementById("result-title").textContent = "RETO COMPLETADO";
    document.getElementById("result-subtitle").textContent = "Buen desempeño. Seguí practicando para superar tu récord.";
  }

  records.sprint.best = Math.max(prevBest, appState.myScore);
  records.sprint.bestAccuracy = Math.max(records.sprint.bestAccuracy, accuracy);
  records.sprint.plays += 1;
  saveRecords(records);

  document.getElementById("res-my-score").textContent = appState.myScore.toLocaleString('en-US');
  document.getElementById("res-opp-score").textContent = prevBest.toLocaleString('en-US');
  document.getElementById("res-accuracy").textContent = `${accuracy.toFixed(1)}%`;
  document.getElementById("res-new-elo").textContent = records.sprint.best.toLocaleString('en-US');

  const breakdownList = document.getElementById("breakdown-list");
  breakdownList.innerHTML = "";
  appState.breakdown.forEach(item => {
    const li = document.createElement("li");
    const statusClass = item.status === "CORRECTO" ? "ok" : "err";
    li.innerHTML = `
      <span>Ronda ${item.round}: <strong class="${statusClass}">${item.status}</strong> (${item.time}s)</span>
      <span>+${item.pts} pts</span>
    `;
    breakdownList.appendChild(li);
  });

  refreshRecordBadges();
}

// ============ MARATHON MODE (60s continuous) ============

function setupMarathonMode() {
  document.getElementById("btn-start-timeattack").addEventListener("click", () => {
    audio.playTick();
    document.getElementById("timeattack-tab").querySelector(".card.glass").classList.add("hidden");
    document.getElementById("marathon-gameplay").classList.remove("hidden");
    document.getElementById("marathon-results").classList.add("hidden");
    startMarathon();
  });

  document.getElementById("btn-marathon-again").addEventListener("click", () => {
    document.getElementById("marathon-results").classList.add("hidden");
    document.getElementById("timeattack-tab").querySelector(".card.glass").classList.remove("hidden");
    refreshRecordBadges();
  });
}

function startMarathon() {
  marathonState.active = true;
  marathonState.score = 0;
  marathonState.answered = 0;
  marathonState.correct = 0;
  marathonState.timeLeft = 60.0;

  updateMarathonHUD();
  loadMarathonQuestion();
  startMarathonTimer();
}

function updateMarathonHUD() {
  document.getElementById("marathon-score").textContent = `${marathonState.score.toLocaleString('en-US')} pts`;
  document.getElementById("marathon-count").textContent = `Preguntas: ${marathonState.answered}`;
}

function startMarathonTimer() {
  clearInterval(marathonState.timerInterval);
  const timerCircle = document.getElementById("marathon-timer-circle");
  const timerText = document.getElementById("marathon-timer");
  const fill = document.getElementById("marathon-progress-fill");

  marathonState.timerInterval = setInterval(() => {
    marathonState.timeLeft -= 0.1;
    if (marathonState.timeLeft <= 0) {
      marathonState.timeLeft = 0;
      clearInterval(marathonState.timerInterval);
      endMarathon();
      return;
    }

    timerText.textContent = marathonState.timeLeft.toFixed(1);
    const pct = (marathonState.timeLeft / 60.0) * 100;
    fill.style.width = `${pct}%`;

    if (marathonState.timeLeft <= 10.0) {
      timerCircle.style.borderColor = "var(--danger-red)";
    } else {
      timerCircle.style.borderColor = "var(--accent-gold)";
    }
  }, 100);
}

function loadMarathonQuestion() {
  if (!marathonState.active) return;

  const challengeGen = ultraShortChallenges[Math.floor(Math.random() * ultraShortChallenges.length)];
  const problem = challengeGen();
  marathonState.currentProblem = problem;

  document.getElementById("marathon-category").textContent = problem.category;
  document.getElementById("marathon-diff").textContent = `+${problem.diffPoints} PTS`;
  document.getElementById("marathon-question").textContent = problem.question;
  document.getElementById("marathon-formula-hint").textContent = problem.formulaHint;
  document.getElementById("marathon-visual").innerHTML = problem.visualHTML;

  const optionsGrid = document.getElementById("marathon-options-grid");
  optionsGrid.innerHTML = "";

  problem.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleMarathonAnswer(opt, btn));
    optionsGrid.appendChild(btn);
  });
}

function handleMarathonAnswer(selectedOpt, btnElement) {
  if (!marathonState.active) return;

  const problem = marathonState.currentProblem;
  const isCorrect = (selectedOpt === problem.correct);

  const allBtns = document.querySelectorAll("#marathon-options-grid .option-btn");
  allBtns.forEach(b => b.disabled = true);

  marathonState.answered++;

  if (isCorrect) {
    btnElement.classList.add("correct");
    audio.playCorrect();
    marathonState.score += problem.diffPoints;
    marathonState.correct++;
  } else {
    btnElement.classList.add("wrong");
    audio.playWrong();
    allBtns.forEach(b => {
      if (b.textContent === problem.correct) b.classList.add("correct");
    });
  }

  updateMarathonHUD();

  setTimeout(() => {
    if (marathonState.active) loadMarathonQuestion();
  }, 700);
}

function endMarathon() {
  marathonState.active = false;
  clearInterval(marathonState.timerInterval);

  document.getElementById("marathon-gameplay").classList.add("hidden");
  document.getElementById("marathon-results").classList.remove("hidden");

  const accuracy = marathonState.answered > 0 ? (marathonState.correct / marathonState.answered) * 100 : 0;
  const prevBest = records.marathon.best;
  const isNewRecord = marathonState.score > prevBest;

  audio.playVictory();
  document.getElementById("marathon-result-subtitle").textContent = isNewRecord
    ? "¡Nuevo récord personal en el modo maratón!"
    : "Buen ritmo. Intentá superar tu récord la próxima vez.";

  records.marathon.best = Math.max(prevBest, marathonState.score);
  records.marathon.bestAccuracy = Math.max(records.marathon.bestAccuracy, accuracy);
  records.marathon.plays += 1;
  saveRecords(records);

  document.getElementById("marathon-res-score").textContent = marathonState.score.toLocaleString('en-US');
  document.getElementById("marathon-res-count").textContent = marathonState.answered;
  document.getElementById("marathon-res-accuracy").textContent = `${accuracy.toFixed(1)}%`;
  document.getElementById("marathon-res-best").textContent = records.marathon.best.toLocaleString('en-US');

  refreshRecordBadges();
}

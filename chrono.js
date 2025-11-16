/* chrono.js - racchiuso in DOMContentLoaded per far funzionare i tasti */
document.addEventListener('DOMContentLoaded', () => {

let startTs = null;
let timerInterval = null;
let elapsedBefore = 0;
let laps = [];

/* DOM */
const minSpan = document.getElementById('min');
const centSpan = document.getElementById('cent');
const millSpan = document.getElementById('mill');
const lapsTable = document.getElementById('lapsTable');

const startBtn = document.getElementById('startBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');

const savedSessionsSelect = document.getElementById('savedSessions');
const saveSessionBtn = document.getElementById('saveSession');
const loadSessionBtn = document.getElementById('loadSession');
const deleteSessionBtn = document.getElementById('deleteSession');
const exportBtn = document.getElementById('exportCSV');
const sessionNameInput = document.getElementById('sessionName');

const avgLapSpan = document.getElementById('avgLap');
const tbValueSpan = document.getElementById('tbValue');
const tsValueSpan = document.getElementById('tsValue');
const majInput = document.getElementById('maj');


/* -----------------------------------------------------------
   NUOVO FORMATTER: minuti : centesimi di minuto : millesimi
   -----------------------------------------------------------
*/
function formatTime(ms) {
  if (!isFinite(ms) || ms <= 0) return "00:00:00";

  const minutes = ms / 60000; // da ms → minuti
  const min = Math.floor(minutes);
  const fractional = minutes - min;

  const cent = Math.floor(fractional * 100); // centesimi di minuto
  const mill = Math.floor((fractional * 100 - cent) * 1000); // millesimi

  return (
    String(min).padStart(2, "0") + ":" +
    String(cent).padStart(2, "0") + ":" +
    String(mill).padStart(3, "0")
  );
}

/* Update big display (mm:CC:MMM) */
function updateDisplay(ms) {
  if (!isFinite(ms) || ms <= 0) {
    minSpan.textContent = "00";
    centSpan.textContent = "00";
    millSpan.textContent = "000";
    return;
  }

  const minutes = ms / 60000;
  const min = Math.floor(minutes);
  const fractional = minutes - min;

  const cent = Math.floor(fractional * 100);
  const mill = Math.floor((fractional * 100 - cent) * 1000);

  minSpan.textContent = String(min).padStart(2, "0");
  centSpan.textContent = String(cent).padStart(2, "0");
  millSpan.textContent = String(mill).padStart(3, "0");
}


/* START / STOP */
startBtn.addEventListener('click', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    elapsedBefore += Date.now() - startTs;
    startTs = null;
    startBtn.textContent = "Start";
    lapBtn.disabled = true;
  } else {
    startTs = Date.now();
    timerInterval = setInterval(() => {
      updateDisplay(elapsedBefore + (Date.now() - startTs));
    }, 30);
    startBtn.textContent = "Stop";
    lapBtn.disabled = false;
  }
});

/* LAP */
lapBtn.addEventListener('click', () => {
  const now = Date.now();
  const current = ela

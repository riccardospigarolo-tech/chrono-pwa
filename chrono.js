/* chrono.js - racchiuso in DOMContentLoaded per far funzionare i tasti */
document.addEventListener('DOMContentLoaded', () => {

let startTs = null;
let timerInterval = null;
let elapsedBefore = 0;
let laps = [];

/* NEW: anteprima lap corrente */
let liveLapPreview = null;

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

/* FORMAT: mm:CC:MMM (centesimi + millesimi di minuto) */
function formatTime(ms) {
  if (!isFinite(ms) || ms <= 0) return "00:00:000";

  const totalMinutes = ms / 60000;

  const min = Math.floor(totalMinutes);
  const fractional = totalMinutes - min;

  const cent = Math.floor(fractional * 100);
  const milli = Math.floor((fractional * 100 - cent) * 1000);

  return (
    String(min).padStart(2,'0') + ":" +
    String(cent).padStart(2,'0') + ":" +
    String(milli).padStart(3,'0')
  );
}

/* Update big display */
function updateDisplay(ms) {
  if (ms <= 0) {
    minSpan.textContent = "00";
    centSpan.textContent = "00";
    millSpan.textContent = "000";
    return;
  }

  const totalMinutes = ms / 60000;

  const min = Math.floor(totalMinutes);
  const fractional = totalMinutes - min;

  const cent = Math.floor(fractional * 100);
  const milli = Math.floor((fractional * 100 - cent) * 1000);

  minSpan.textContent = String(min).padStart(2,'0');
  centSpan.textContent = String(cent).padStart(2,'0');
  millSpan.textContent = String(milli).padStart(3,'0');
}

/* START / STOP */
startBtn.addEventListener('click', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    elapsedBefore += Date.now() - startTs;
    startTs = null;
    liveLapPreview = null; // stop anteprima
    renderLaps();
    startBtn.textContent = "Start";
    lapBtn.disabled = true;
  } else {
    startTs = Date.now();
    timerInterval = setInterval(() => {
      const cur = elapsedBefore + (Date.now() - startTs);
      updateDisplay(cur);
      updateLiveLapPreview(cur);  // <-- anteprima
    }, 20);
    startBtn.textContent = "Stop";
    lapBtn.disabled = false;
  }
});

/* NEW: anteprima lap */
function updateLiveLapPreview(currentMs) {
  if (laps.length < 1) return; // anteprima dal 2° lap in poi
  const lastCum = laps[laps.length - 1].cumMs;
  const lapMs = currentMs - lastCum;
  liveLapPreview = { index: laps.length + 1, lapMs: lapMs, cumMs: currentMs };
  renderLaps();
}

/* LAP */
lapBtn.addEventListener('click', () => {
  const now = Date.now();
  const current = elapsedBefore + (startTs ? now - startTs : 0);
  const lastCum = laps.length ? laps[laps.length - 1].cumMs : 0;
  const lapMs = current - lastCum;

  laps.push({ index: laps.length + 1, lapMs: lapMs, cumMs: current });

  liveLapPreview = null; // azzera anteprima
  renderLaps();
});

/* RESET */
resetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  startTs = null;
  elapsedBefore = 0;
  laps = [];
  liveLapPreview = null;
  updateDisplay(0);
  lapsTable.innerHTML = "";
  startBtn.textContent = "Start";
  lapBtn.disabled = true;
  refreshSessionsList();
  updateAverage();
  updateTimeStudy();
});

/* RENDER LAPS */
function renderLaps(){
    lapsTable.innerHTML = "";

    if(laps.length===0){
        updateAverage();
        updateTimeStudy();
        return;
    }

    const fastest=Math.min(...laps.map(l => l.lapMs));
    const slowest=Math.max(...laps.map(l => l.lapMs));

    for(let i=laps.length-1;i>=0;i--){
        const l=laps[i];
        const tr=document.createElement('tr');
        const cls=(l.lapMs===fastest)?'lap-fast':(l.lapMs===slowest?'lap-slow':'');

        tr.innerHTML=`<td style="width:48px">${l.index}</td>
                      <td class="${cls}">${formatTime(l.lapMs

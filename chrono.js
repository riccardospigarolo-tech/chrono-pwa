// chrono.js — Cronometro Aziendale completo con Lap corretti

let startTs = null;
let elapsedBefore = 0;
let timerInterval = null;
let laps = [];

// --- Selettori ---
const display = document.getElementById('display');
const lapsList = document.getElementById('laps');
const startBtn = document.getElementById('startBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const sessionNameInput = document.getElementById('sessionNameInput');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const savedSessionsSelect = document.getElementById('savedSessionsSelect');
const loadSessionBtn = document.getElementById('loadSessionBtn');
const deleteSessionBtn = document.getElementById('deleteSessionBtn');
const exportBtn = document.getElementById('exportBtn');

// --- Funzioni ---
function formatDisplay(ms) {
  const totalMinutes = ms / 60000;
  const minutes = Math.floor(totalMinutes);
  const centesimi = Math.floor((totalMinutes - minutes) * 100);
  const millesimi = Math.floor(((totalMinutes * 1000) % 10));
  return `${String(minutes).padStart(2,'0')}:${String(centesimi).padStart(2,'0')}:${String(millesimi).padStart(2,'0')}`;
}

function updateDisplay(ms) {
  display.textContent = formatDisplay(ms);
}

function renderLaps() {
  lapsList.innerHTML = '';
  if (laps.length === 0) return;

  const min = Math.min(...laps.map(l => l.lapMs));
  const max = Math.max(...laps.map(l => l.lapMs));

  laps.forEach(lap => {
    const li = document.createElement('div');
    li.textContent = `${lap.label} → ${lap.display}`;
    if (lap.lapMs === min) li.classList.add('fast');
    if (lap.lapMs === max) li.classList.add('slow');
    lapsList.appendChild(li);
  });
}

function startTimer() {
  startTs = Date.now();
  timerInterval = setInterval(() => {
    const now = Date.now();
    updateDisplay(elapsedBefore + (now - startTs));
  }, 10);
}

function stopTimer() {
  clearInterval(timerInterval);
  if (startTs) elapsedBefore += Date.now() - startTs;
  startTs = null;
}

function resetTimer() {
  clearInterval(timerInterval);
  startTs = null;
  elapsedBefore = 0;
  laps = [];
  updateDisplay(0);
  renderLaps();
}

// --- Eventi pulsanti ---
startBtn.addEventListener('click', () => {
  if (startTs) {
    stopTimer();
    startBtn.textContent = 'Start';
    lapBtn.disabled = true;
  } else {
    startTimer();
    startBtn.textContent = 'Stop';
    lapBtn.disabled = false;
  }
});

lapBtn.addEventListener('click', () => {
  if (!startTs) return;

  const now = Date.now();
  const totalElapsed = elapsedBefore + (now - startTs);
  const lastCum = laps.length ? laps[laps.length - 1].cumMs : 0;
  const lapMs = totalElapsed - lastCum;

  laps.push({
    index: laps.length + 1,
    label: `Lap ${laps.length + 1}`,
    lapMs,
    cumMs: totalElapsed,
    display: formatDisplay(lapMs)
  });

  renderLaps();
});

resetBtn.addEventListener('click', () => {
  stopTimer();
  startBtn.textContent = 'Start';
  lapBtn.disabled = true;
  resetTimer();
});

// --- Gestione sessioni ---
function saveSessions(obj) {
  localStorage.setItem('chrono_sessions', JSON.stringify(obj));
}

function loadSavedSessions() {
  return JSON.parse(localStorage.getItem('chrono_sessions') || '{}');
}

function refreshSessionsList() {
  const obj = loadSavedSessions();
  savedSessionsSelect.innerHTML = '<option value="">-- Seleziona sessione --</option>';
  Object.keys(obj).forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k;
    savedSessionsSelect.appendChild(o);
  });
}

function showToast(msg){
  console.log(msg);
}

// Salva sessione
saveSessionBtn.addEventListener('click', ()=>{
  const name = sessionNameInput.value.trim() || `session_${new Date().toISOString()}`;
  const obj = loadSavedSessions();
  obj[name] = {
    created: new Date().toLocaleString(),
    laps: laps,
    totalMs: elapsedBefore + (startTs ? Date.now() - startTs : 0)
  };
  saveSessions(obj);
  refreshSessionsList();
  showToast('Sessione salvata');
});

// Carica sessione
loadSessionBtn.addEventListener('click', ()=>{
  const key = savedSessionsSelect.value;
  if(!key) { showToast('Seleziona una sessione'); return; }
  const obj = loadSavedSessions();
  const s = obj[key];
  if(!s) return;
  laps = s.laps || [];
  elapsedBefore = s.totalMs || 0;
  startTs = null;
  clearInterval(timerInterval);
  startBtn.textContent='Start';
  lapBtn.disabled = true;
  renderLaps();
  updateDisplay(elapsedBefore);
  showToast('Sessione caricata');
});

// Elimina sessione
deleteSessionBtn.addEventListener('click', ()=>{
  const key = savedSessionsSelect.value;
  if(!key) { showToast('Seleziona una sessione'); return; }
  const obj = loadSavedSessions();
  delete obj[key];
  saveSessions(obj);
  refreshSessionsList();
  showToast('Sessione eliminata');
});

// Esporta CSV
exportBtn.addEventListener('click', ()=>{
  const key = savedSessionsSelect.value;
  let toExport;
  if(key){
    const obj = loadSavedSessions();
    toExport = obj[key];
  } else {
    toExport = {created:new Date().toLocaleString(), laps:laps, totalMs: elapsedBefore + (startTs?Date.now()-startTs:0)};
  }
  if(!toExport) { showToast('Nessuna sessione da esportare'); return; }
  const csv = buildCSV(toExport);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (savedSessionsSelect.value||'session_export') + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('CSV scaricato');
});

function buildCSV(session){
  const rows = [];
  rows.push(['Session','Created','TotalMs']);
  rows.push([sessionNameInput.value||'', session.created||'', session.totalMs||'']);
  rows.push([]);
  rows.push(['LapIndex','LapLabel','LapMs','CumMs']);
  (session.laps||[]).forEach(l=> rows.push([l.index, l.label, l.lapMs, l.cumMs]));
  return rows.map(r => r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
}

// --- Init ---
refreshSessionsList();
updateDisplay(0);
renderLaps();
lapBtn.disabled = true;

// --- PWA install ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.createElement('button');
  btn.textContent='Installa PWA';
  btn.addEventListener('click', async ()=>{
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if(choice.outcome==='accepted') showToast('App installata');
    deferredPrompt = null;
  });
  document.getElementById('installPrompt').appendChild(btn);
});

// --- Service Worker ---
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js')
    .then(()=>console.log('SW registered'))
    .catch(e=>console.warn('SW failed', e));
}

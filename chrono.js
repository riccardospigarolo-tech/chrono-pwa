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

/* ---- TESTO BIANCO NEI CAMPI ---- */
sessionNameInput.style.color = "white";
savedSessionsSelect.style.color = "white";

/* ---- NUOVO: SPAN CAPO/ORA ACCANTO AL TS ---- */
const capsHourSpan = document.createElement("span");
capsHourSpan.style.marginLeft = "12px";
capsHourSpan.style.fontWeight = "bold";
capsHourSpan.style.color = "#000";
tsValueSpan.parentNode.appendChild(capsHourSpan);

/* FORMAT: mm:CC:MMM */
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
    liveLapPreview = null;
    renderLaps();
    startBtn.textContent = "Start";
    lapBtn.disabled = true;
  } else {
    startTs = Date.now();
    timerInterval = setInterval(() => {
      const cur = elapsedBefore + (Date.now() - startTs);
      updateDisplay(cur);
      updateLiveLapPreview(cur);
    }, 20);
    startBtn.textContent = "Stop";
    lapBtn.disabled = false;
  }
});

/* NEW: anteprima lap */
function updateLiveLapPreview(currentMs) {
  if (laps.length < 1) return;
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

  liveLapPreview = null;
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

    if (laps.length === 0) {
        updateAverage();
        updateTimeStudy();
        return;
    }

    const fastest = Math.min(...laps.map(l => l.lapMs));
    const slowest = Math.max(...laps.map(l => l.lapMs));

    for (let i = laps.length - 1; i >= 0; i--) {
        const l = laps[i];
        const tr = document.createElement('tr');
        const cls = (l.lapMs === fastest) ? 'lap-fast' : (l.lapMs === slowest ? 'lap-slow' : '');

        tr.innerHTML = `<td style="width:48px">${l.index}</td>
                        <td class="${cls}">${formatTime(l.lapMs)}</td>
                        <td>${formatTime(l.cumMs)}</td>`;
        lapsTable.appendChild(tr);
    }

    /* NEW: anteprima come PRIMA riga */
    if (liveLapPreview) {
      const p = liveLapPreview;
      const tr = document.createElement('tr');
      tr.classList.add("lap-preview");
      tr.innerHTML = `<td style="width:48px">${p.index}</td>
                      <td>${formatTime(p.lapMs)}</td>
                      <td>${formatTime(p.cumMs)}</td>`;
      lapsTable.prepend(tr);
    }

    updateAverage();
    updateTimeStudy();
}

/* MEDIA */
function updateAverage(){
  if (laps.length === 0) {
    avgLapSpan.textContent = "00:00:000";
    tbValueSpan.textContent = "00:00:000";
    return;
  }
  const total = laps.reduce((s, l) => s + l.lapMs, 0);
  const avg = total / laps.length;
  avgLapSpan.textContent = formatTime(avg);
  tbValueSpan.textContent = formatTime(avg);
}

/* TS = TB * (1 + maj/100) + CAPO/ORA */
function updateTimeStudy(){
  if (laps.length === 0) {
    tsValueSpan.textContent = "00:00:000";
    capsHourSpan.textContent = "";
    return;
  }

  const total = laps.reduce((s,l)=> s + l.lapMs, 0);
  const tb = total / laps.length;
  const maj = parseFloat(majInput.value) || 0;

  const ts = tb * (1 + maj / 100);

  /* TS rimane identico */
  tsValueSpan.textContent = formatTime(Math.round(ts));

  /* CAPO ORA SOLO INFORMATIVO */
  const tsMinutes = ts / 60000;
  const capsOra = tsMinutes > 0 ? Math.floor(60 / tsMinutes) : 0;

  capsHourSpan.textContent = ` → ${capsOra} capi/ora`;
}

majInput.addEventListener('input', updateTimeStudy);

/* ----------------- SESSIONS ----------------- */
function loadSavedSessions(){ return JSON.parse(localStorage.getItem('chrono_sessions') || "{}"); }
function saveSessions(obj){ localStorage.setItem('chrono_sessions', JSON.stringify(obj)); }

function refreshSessionsList(){
  savedSessionsSelect.innerHTML = "";
  const obj = loadSavedSessions();
  Object.keys(obj).forEach(k=>{
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    savedSessionsSelect.appendChild(opt);
  });
}

/* SAVE */
saveSessionBtn.addEventListener('click', ()=>{
  const name = sessionNameInput.value.trim() || `session_${new Date().toISOString()}`;
  const obj = loadSavedSessions();
  obj[name] = { created: new Date().toLocaleString(), laps: laps, totalMs: elapsedBefore + (startTs ? Date.now() - startTs : 0) };
  saveSessions(obj);
  refreshSessionsList();
});

/* LOAD */
loadSessionBtn.addEventListener('click', ()=>{
  const key = savedSessionsSelect.value;
  if (!key) return;
  const obj = loadSavedSessions();
  const s = obj[key];
  if (!s) return;
  laps = s.laps || [];
  elapsedBefore = s.totalMs || 0;
  startTs = null;
  clearInterval(timerInterval);
  timerInterval = null;
  startBtn.textContent = "Start";
  lapBtn.disabled = true;
  updateDisplay(elapsedBefore);
  renderLaps();
});

/* DELETE */
deleteSessionBtn.addEventListener('click', ()=>{
  const key = savedSessionsSelect.value;
  if (!key) return;
  const obj = loadSavedSessions();
  delete obj[key];
  saveSessions(obj);
  refreshSessionsList();
});

/* EXPORT CSV */
exportBtn.addEventListener('click', ()=>{
  const key = savedSessionsSelect.value;
  let toExport;
  const obj = loadSavedSessions();

  if (key) toExport = obj[key];
  else
    toExport = {
      created: new Date().toLocaleString(),
      laps: laps,
      totalMs: elapsedBefore + (startTs ? Date.now() - startTs : 0)
    };

  if (!toExport) return;

  const rows = [["Index","Lap (ms)","Lap (fmt)","Cumulato (ms)","Cumulato (fmt)"]];

  (toExport.laps || []).forEach(l => {
    rows.push([
      l.index,
      l.lapMs,
      formatTime(l.lapMs),
      l.cumMs,
      formatTime(l.cumMs)
    ]);
  });

  const csv = rows.map(r => r.join(",")).join("\r\n");

  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (key || 'session') + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* INIT */
refreshSessionsList();
updateDisplay(0);
updateAverage();
updateTimeStudy();
lapBtn.disabled = true;

}); // END DOMContentLoaded

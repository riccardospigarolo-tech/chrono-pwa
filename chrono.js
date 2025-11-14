let startTs = null;
let timerInterval = null;
let elapsedBefore = 0;
let laps = [];

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

function formatTime(ms) {
    let minutes = Math.floor(ms / 60000);
    let cent = Math.floor((ms % 60000) / 1000 * 100 / 60);
    let mill = Math.floor(ms % 1000 / 10);

    return `${String(minutes).padStart(2, '0')}:${String(cent).padStart(2, '0')}:${String(mill).padStart(2, '0')}`;
}

function updateDisplay(ms) {
    let minutes = Math.floor(ms / 60000);
    let cent = Math.floor((ms % 60000) / 1000 * 100 / 60);
    let mill = Math.floor(ms % 1000 / 10);

    minSpan.textContent = String(minutes).padStart(2, '0');
    centSpan.textContent = String(cent).padStart(2, '0');
    millSpan.textContent = String(mill).padStart(2, '0');
}

startBtn.addEventListener('click', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
        elapsedBefore += Date.now() - startTs;
        timerInterval = null;
        startBtn.textContent = 'Start';
        lapBtn.disabled = true;
    } else {
        startTs = Date.now();
        timerInterval = setInterval(() => {
            updateDisplay(elapsedBefore + (Date.now() - startTs));
        }, 10);
        startBtn.textContent = 'Stop';
        lapBtn.disabled = false;
    }
});

lapBtn.addEventListener('click', () => {
    const current = elapsedBefore + (startTs ? Date.now() - startTs : 0);

    let lapMs = current - (laps.length ? laps[laps.length - 1].cumMs : 0);

    laps.push({
        index: laps.length + 1,
        lapMs: lapMs,
        cumMs: current
    });

    renderLaps();
});

resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    elapsedBefore = 0;
    startTs = null;
    laps = [];
    updateDisplay(0);
    lapsTable.innerHTML = "";
    startBtn.textContent = "Start";
    lapBtn.disabled = true;
});

function renderLaps() {
    lapsTable.innerHTML = "";

    let fastest = Math.min(...laps.map(l => l.lapMs));
    let slowest = Math.max(...laps.map(l => l.lapMs));

    laps.forEach(l => {
        let tr = document.createElement('tr');

        let cls = "";
        if (l.lapMs === fastest) cls = "lap-fast";
        if (l.lapMs === slowest) cls = "lap-slow";

        tr.innerHTML = `
            <td>${l.index}</td>
            <td class="${cls}">${formatTime(l.lapMs)}</td>
            <td>${formatTime(l.cumMs)}</td>
        `;
        lapsTable.appendChild(tr);
    });

    updateAverage();
    updateTimeStudy();
}

function updateAverage() {
    if (laps.length === 0) {
        document.getElementById('avgLap').textContent = "00:00:00";
        return;
    }

    let total = laps.reduce((sum, l) => sum + l.lapMs, 0);
    let avg = total / laps.length;

    document.getElementById('avgLap').textContent = formatTime(avg);
}

function updateTimeStudy() {
    let total = laps.reduce((s, l) => s + l.lapMs, 0);
    document.getElementById('baseTime').textContent = formatTime(total);

    let maj = parseFloat(document.getElementById('maj').value) || 0;
    let std = total * (1 + maj / 100);
    document.getElementById('stdTime').textContent = formatTime(std);
}

document.getElementById('maj').addEventListener('input', updateTimeStudy);

/* ------------ Sessioni LocalStorage ------------ */

function loadSavedSessions() {
    return JSON.parse(localStorage.getItem('chrono_sessions') || "{}");
}

function saveSessions(obj) {
    localStorage.setItem('chrono_sessions', JSON.stringify(obj));
}

function refreshSessionsList() {
    const obj = loadSavedSessions();
    savedSessionsSelect.innerHTML = "";
    Object.keys(obj).forEach(k => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        savedSessionsSelect.appendChild(opt);
    });
}

saveSessionBtn.addEventListener('click', () => {
    const name = sessionNameInput.value.trim() || `session_${new Date().toISOString()}`;
    const obj = loadSavedSessions();

    obj[name] = {
        created: new Date().toLocaleString(),
        laps: laps,
        totalMs: elapsedBefore + (startTs ? Date.now() - startTs : 0)
    };

    saveSessions(obj);
    refreshSessionsList();
});

loadSessionBtn.addEventListener('click', () => {
    const key = savedSessionsSelect.value;
    if (!key) return;

    const obj = loadSavedSessions();
    const s = obj[key];

    laps = s.laps || [];
    elapsedBefore = s.totalMs || 0;

    startTs = null;
    clearInterval(timerInterval);
    startBtn.textContent = 'Start';
    lapBtn.disabled = true;

    updateDisplay(elapsedBefore);
    renderLaps();
});

deleteSessionBtn.addEventListener('click', () => {
    const key = savedSessionsSelect.value;
    if (!key) return;

    const obj = loadSavedSessions();
    delete obj[key];

    saveSessions(obj);
    refreshSessionsList();
});

exportBtn.addEventListener('click', () => {
    const key = savedSessionsSelect.value;

    let toExport;
    const obj = loadSavedSessions();

    if (key) {
        toExport = obj[key];
    } else {
        toExport = {
            created: new Date().toLocaleString(),
            laps: laps,
            totalMs: elapsedBefore + (startTs ? Date.now() - startTs : 0)
        };
    }

    const csv = buildCSV(toExport);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = (key || 'session') + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
});

function buildCSV(session) {
    const rows = [];
    rows.push(["Index", "Lap", "Cumulato"]);
    session.laps.forEach(l => {
        rows.push([l.index, formatTime(l.lapMs), formatTime(l.cumMs)]);
    });

    return rows.map(r => r.join(",")).join("\n");
}

refreshSessionsList();

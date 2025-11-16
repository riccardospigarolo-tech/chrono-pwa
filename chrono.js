/* chrono.js - racchiuso in DOMContentLoaded per far funzionare i tasti */
document.addEventListener('DOMContentLoaded', () => {

  try {
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

    // Verifica che tutti gli elementi necessari esistano
    const requiredEls = [
      ['min', minSpan],
      ['cent', centSpan],
      ['mill', millSpan],
      ['lapsTable', lapsTable],
      ['startBtn', startBtn],
      ['lapBtn', lapBtn],
      ['resetBtn', resetBtn],
      ['savedSessions', savedSessionsSelect],
      ['saveSession', saveSessionBtn],
      ['loadSession', loadSessionBtn],
      ['deleteSession', deleteSessionBtn],
      ['exportCSV', exportBtn],
      ['sessionName', sessionNameInput],
      ['avgLap', avgLapSpan],
      ['tbValue', tbValueSpan],
      ['tsValue', tsValueSpan],
      ['maj', majInput]
    ];

    const missing = requiredEls.filter(([name, el]) => !el).map(([name]) => name);
    if (missing.length) {
      console.error('chrono.js: elementi DOM mancanti:', missing.join(', '));
      // Non proseguiamo per evitare errori a cascata
      return;
    }

    /* -----------------------------------------------------------
       NUOVO FORMATTER: minuti : centesimi di minuto : millesimi
       -----------------------------------------------------------
    */
    function formatTime(ms) {
      if (!isFinite(ms) || ms <= 0) return "00:00:000";

      const minutes = ms / 60000; // da ms → minuti
      const min = Math.floor(minutes);
      const fractional = minutes - min;

      const cent = Math.floor(fractional * 100); // centesimi di minuto
      // millesimi come residuo tra 0 e 999
      const mill = Math.floor((fractional * 100 - cent) * 1000);

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
      try {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
          elapsedBefore += Date.now() - startTs;
          startTs = null;
          startBtn.textContent = "Start";
          lapBtn.disabled = true;
        } else {
          startTs = Date.now();
          // interval più stabile: 50 ms
          timerInterval = setInterval(() => {
            updateDisplay(elapsedBefore + (Date.now() - startTs));
          }, 50);
          startBtn.textContent = "Stop";
          lapBtn.disabled = false;
        }
      } catch (e) {
        console.error('Errore in startBtn click:', e);
      }
    });

    /* LAP */
    lapBtn.addEventListener('click', () => {
      try {
        const now = Date.now();
        const current = elapsedBefore + (startTs ? now - startTs : 0);
        const lastCum = laps.length ? laps[laps.length - 1].cumMs : 0;
        const lapMs = current - lastCum;
        laps.push({ index: laps.length + 1, lapMs: lapMs, cumMs: current });
        renderLaps();
      } catch (e) {
        console.error('Errore in lapBtn click:', e);
      }
    });

    /* RESET */
    resetBtn.addEventListener('click', () => {
      try {
        clearInterval(timerInterval);
        timerInterval = null;
        startTs = null;
        elapsedBefore = 0;
        laps = [];
        updateDisplay(0);
        lapsTable.innerHTML = "";
        startBtn.textContent = "Start";
        lapBtn.disabled = true;
        refreshSessionsList();
        updateAverage();
        updateTimeStudy();
      } catch (e) {
        console.error('Errore in resetBtn click:', e);
      }
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

      // Ordine inverso: ultimo lap in cima
      for(let i=laps.length-1;i>=0;i--){
          const l=laps[i];
          const tr=document.createElement('tr');
          const cls=(l.lapMs===fastest)?'lap-fast':(l.lapMs===slowest?'lap-slow':'');
          tr.innerHTML=`<td style="width:48px">${l.index}</td>
                          <td class="${cls}">${formatTime(l.lapMs)}</td>
                          <td>${formatTime(l.cumMs)}</td>`;
          lapsTable.appendChild(tr);
      }

      updateAverage();
      updateTimeStudy();
    }

    /* MEDIA (TB) */
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

    /* TIME STUDY: TS = TB * (1 + maj/100) */
    function updateTimeStudy(){
      if (laps.length === 0) {
        tsValueSpan.textContent = "00:00:000";
        return;
      }
      const total = laps.reduce((s,l)=> s + l.lapMs, 0);
      const tb = total / (laps.length || 1);
      const maj = parseFloat(majInput.value) || 0;
      const ts = tb * (1 + maj / 100);
      tsValueSpan.textContent = formatTime(Math.round(ts));
    }

    /* maj change */
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
      else toExport = { created: new Date().toLocaleString(), laps: laps, totalMs: elapsedBefore + (startTs ? Date.now() - startTs : 0) };

      if (!toExport) return;

      const rows = [["Index","Lap","Cumulato"]];
      (toExport.laps || []).forEach(l => rows.push([l.index, formatTime(l.lapMs), formatTime(l.cumMs)]));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");

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

    /* PWA: install prompt + SW */
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt',(e)=>{
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.createElement('button');
      btn.textContent = 'Installa App';
      btn.className = 'btn btn-primary';
      btn.style.position='fixed';
      btn.style.right='18px';
      btn.style.bottom='18px';
      btn.addEventListener('click', async ()=>{
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        btn.remove();
      });
      document.getElementById('installPrompt').appendChild(btn);
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW registered')).catch(e=>console.warn('SW fail', e));
    }

  } catch (err) {
    console.error('Errore inatteso in chrono.js:', err);
  }

}); // END DOMContentLoaded

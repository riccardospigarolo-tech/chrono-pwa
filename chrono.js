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

  function formatTime(ms){
    if(!isFinite(ms) || ms <=0) return "00:00:00";
    const totalCentis = Math.round(ms/10);
    const cs = totalCentis % 100;
    const totalSeconds = Math.floor(totalCentis/100);
    const sec = totalSeconds % 60;
    const min = Math.floor(totalSeconds/60);
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(cs).padStart(2,'0')}`;
  }

  function updateDisplay(ms){
    const totalCentis = Math.round(ms/10);
    const cs = totalCentis % 100;
    const totalSeconds = Math.floor(totalCentis/100);
    const sec = totalSeconds % 60;
    const min = Math.floor(totalSeconds/60);
    minSpan.textContent = String(min).padStart(2,'0');
    centSpan.textContent = String(sec).padStart(2,'0');
    millSpan.textContent = String(cs).padStart(2,'0');
  }

  startBtn.addEventListener('click', ()=>{
    if(timerInterval){
      clearInterval(timerInterval);
      timerInterval=null;
      elapsedBefore += Date.now() - startTs;
      startTs=null;
      startBtn.textContent="Start";
      lapBtn.disabled=true;
    } else {
      startTs=Date.now();
      timerInterval=setInterval(()=>{
        updateDisplay(elapsedBefore + (Date.now()-startTs));
      },30);
      startBtn.textContent="Stop";
      lapBtn.disabled=false;
    }
  });

  lapBtn.addEventListener('click', ()=>{
    const now=Date.now();
    const current=elapsedBefore + (startTs? now-startTs : 0);
    const lastCum = laps.length ? laps[laps.length-1].cumMs :0;
    const lapMs = current-lastCum;
    laps.push({ index:laps.length+1, lapMs:lapMs, cumMs:current });
    renderLaps();
  });

  resetBtn.addEventListener('click', ()=>{
    clearInterval(timerInterval);
    timerInterval=null;
    startTs=null;
    elapsedBefore=0;
    laps=[];
    updateDisplay(0);
    lapsTable.innerHTML="";
    startBtn.textContent="Start";
    lapBtn.disabled=true;
    refreshSessionsList();
    updateAverage();
    updateTimeStudy();
  });

  function renderLaps(){
    lapsTable.innerHTML="";
    if(laps.length===0){
      updateAverage();
      updateTimeStudy();
      return;
    }

    const fastest=Math.min(...laps.map(l=>l.lapMs));
    const slowest=Math.max(...laps.map(l=>l.lapMs));

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

  function updateAverage(){
    if(laps.length===0){
      avgLapSpan.textContent="00:00:00";
      tbValueSpan.textContent="00:00:00";
      return;
    }
    const total=laps.reduce((s,l)=>s+l.lapMs,0);
    const avg=total/laps.length;
    avgLapSpan.textContent=formatTime(avg);
    tbValueSpan.textContent=formatTime(avg);

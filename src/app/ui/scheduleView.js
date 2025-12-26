
import { drawJPG } from '../utils/exporter.js';

// Render time grid and blocks
export function renderGrid(state) {
  const host = document.getElementById('grid');
  host.innerHTML = '';
  const table = document.createElement('div');
  table.className = 'grid-table';

  // Determine time range: if start/end exist use them; else show placeholder lines from 9:00 to 12:00
  let start = state.session.start || '09:00';
  let end = state.session.end || '12:00';
  
  // Validate time range: if start is after end, swap them
  if (start && end && timeToMinutes(start) >= timeToMinutes(end)) {
    [start, end] = [end, start];
  }
  
  const step = state.timeStepMin; // 15

  const times = enumerateTimes(start, end, step);

  // Build columns wrapper
  const wrapper = document.createElement('div');
  wrapper.style.display = 'grid';
  wrapper.style.gridTemplateColumns = '64px 1fr 1fr 1fr';

  // Time column
  const timeCol = document.createElement('div');
  timeCol.style.position = 'relative';
  timeCol.style.borderRight = '1px solid #d9d9d9';
  times.forEach((t, idx) => {
    const row = document.createElement('div');
    row.style.height = `${rowHeight(step)}px`;
    row.style.borderBottom = '1px solid #eee';
    if (idx % 2 === 0) { // label every 30 min
      const label = document.createElement('div');
      label.className = 'grid-time';
      label.textContent = t;
      label.style.lineHeight = `${rowHeight(step)}px`;
      row.appendChild(label);
    }
    timeCol.appendChild(row);
  });
  wrapper.appendChild(timeCol);

  ['global','lane1','lane2'].forEach(laneId => {
    const col = document.createElement('div');
    col.className = 'grid-col';
    col.style.position = 'relative';
    col.style.borderLeft = '1px solid #d9d9d9';
    // Render blocks for this lane
    const blocks = state.blocks.filter(b => b.laneId === laneId);
    blocks.forEach(b => {
      const el = document.createElement('div');
      el.className = 'block';
      const top = positionFromTime(times, b.start, step);
      const height = (b.durationMin / step) * rowHeight(step);
      el.style.top = `${top}px`;
      el.style.height = `${height}px`;
      el.innerHTML = `<div class="title">${b.title}</div><div class="sub">${b.durationMin}分</div>`;
      col.appendChild(el);
    });
    wrapper.appendChild(col);
  });

  host.appendChild(wrapper);
}

function rowHeight(step) { return step === 15 ? 24 : 24; }
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(x => parseInt(x, 10));
  return h * 60 + m;
}
function enumerateTimes(start, end, step) {
  const times = [];
  const [sh, sm] = start.split(':').map(x=>parseInt(x,10));
  const [eh, em] = end.split(':').map(x=>parseInt(x,10));
  let totalStart = sh*60+sm;
  const totalEnd = eh*60+em;
  for (let t = totalStart; t <= totalEnd; t += step) {
    const h = Math.floor(t/60);
    const m = String(t%60).padStart(2,'0');
    times.push(`${String(h).padStart(2,'0')}:${m}`);
  }
  return times;
}
function positionFromTime(times, start, step) {
  const idx = times.indexOf(start);
  return Math.max(0, idx) * rowHeight(step);
}

export function addBlockToSchedule(state, { menuId, title, laneId, start, durationMin }) {
  state.blocks.push({ menuId, title, laneId, start, durationMin });
  renderGrid(state);
}

// Lane picker modal
export function openLanePicker(state, onDone) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-lane');
  const group = document.getElementById('lane-radio-group');
  const ok = document.getElementById('lane-ok');
  const cancel = document.getElementById('lane-cancel');
  group.innerHTML = '';
  const lanes = ['global','lane1','lane2'];
  lanes.forEach(id => {
    const l = state.lanesById[id];
    const label = document.createElement('label');
    label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '8px'; label.style.marginBottom = '6px';
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'lane-radio'; radio.value = id;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(l.name));
    group.appendChild(label);
  });
  backdrop.hidden = false; modal.hidden = false;
  ok.onclick = () => {
    const selected = document.querySelector('input[name="lane-radio"]:checked');
    if (!selected) return;
    backdrop.hidden = true; modal.hidden = true;
    onDone(selected.value);
  };
  cancel.onclick = () => { backdrop.hidden = true; modal.hidden = true; };
}

// Time picker modal
export function openTimePicker(state, defaultDuration, onDone) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-time');
  const startInput = document.getElementById('pick-start');
  const durInput = document.getElementById('pick-duration');
  durInput.value = String(defaultDuration || 20);

  // Suggest start: if session.start set, use it; else use '09:00'
  startInput.value = state.session.start || '09:00';

  const ok = document.getElementById('time-ok');
  const cancel = document.getElementById('time-cancel');
  backdrop.hidden = false; modal.hidden = false;
  ok.onclick = () => {
    const start = startInput.value || '09:00';
    const dur = Math.max(5, parseInt(durInput.value||'15',10));
    backdrop.hidden = true; modal.hidden = true;
    onDone(start, dur);
  };
  cancel.onclick = () => { backdrop.hidden = true; modal.hidden = true; };
}

// Rename lane modal
export function openRenameLane(state, laneId, onSave, onReset) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-rename');
  const input = document.getElementById('rename-input');
  const ok = document.getElementById('rename-ok');
  const cancel = document.getElementById('rename-cancel');
  const reset = document.getElementById('rename-reset');

  input.value = state.lanesById[laneId].name;
  backdrop.hidden = false; modal.hidden = false;
  ok.onclick = () => { const v = input.value.trim(); if (v.length<1||v.length>20) return; backdrop.hidden = true; modal.hidden = true; onSave(v); };
  cancel.onclick = () => { backdrop.hidden = true; modal.hidden = true; };
  reset.onclick = () => { backdrop.hidden = true; modal.hidden = true; onReset(); };
}

// Export to JPG (1080x1920)
export function exportScheduleAsJPG(state) {
  const btnExport = document.getElementById('btn-export-jpg');
  if (!btnExport) return;
  
  btnExport.addEventListener('click', () => {
    const width = 1080, height = 1920;
    const dataUrl = drawJPG(state, width, height);
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `schedule_${state.session.date||'undated'}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
  });
}

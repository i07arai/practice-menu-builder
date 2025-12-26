
// 簡易JPGエクスポート：Canvasに描画してDataURLを返す
export function drawJPG(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  // 背景
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 48px system-ui';
  ctx.fillText('タイムスケジュール', 40, 80);

  // Lane headers
  const laneW = Math.floor((width - 140) / 3);
  const startY = 140;
  const headerH = 60;
  const leftX = 100;
  const lanes = ['global','lane1','lane2'];
  lanes.forEach((id, i) => {
    const name = state.lanesById[id].name;
    const x = leftX + i*laneW;
    ctx.strokeRect(x, startY, laneW-8, headerH);
    ctx.font = 'bold 32px system-ui';
    ctx.fillText(name, x+12, startY+40);
  });

  // Time grid
  const step = state.timeStepMin; // 15
  const gridTop = startY + headerH + 10;
  const gridBottom = height - 80;
  const gridHeight = gridBottom - gridTop;
  const rowPx = 28; // per 15 min
  const rows = Math.floor(gridHeight / rowPx);
  // Determine time range
  const startTime = state.session.start || '09:00';
  const endTime = state.session.end || '12:00';
  const times = enumerateTimes(startTime, endTime, step);

  // Draw time labels and horizontal lines
  ctx.font = '24px system-ui';
  times.forEach((t, idx) => {
    const y = gridTop + idx*rowPx;
    ctx.strokeStyle = '#dddddd';
    ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(width-40, y); ctx.stroke();
    if (idx % 2 === 0) { ctx.fillStyle = '#666666'; ctx.fillText(t, 40, y+20); ctx.fillStyle = '#000000'; }
  });

  // Draw blocks per lane
  state.blocks.forEach(b => {
    const laneIndex = b.laneId === 'global' ? 0 : (b.laneId === 'lane1' ? 1 : 2);
    const x = leftX + laneIndex*laneW + 6;
    const topIdx = times.indexOf(b.start);
    const y = gridTop + Math.max(0, topIdx)*rowPx + 4;
    const h = Math.max(rowPx, Math.round(b.durationMin/step)*rowPx) - 8;
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
    ctx.strokeRect(x, y, laneW-20, h);
    ctx.font = 'bold 28px system-ui';
    ctx.fillText(b.title, x+10, y+32);
    ctx.font = '24px system-ui';
    ctx.fillStyle = '#666666'; ctx.fillText(`${b.durationMin}分`, x+10, y+60);
    ctx.fillStyle = '#000000';
  });

  return canvas.toDataURL('image/jpeg', 0.92);
}

function enumerateTimes(start, end, step) {
  const out = [];
  const [sh, sm] = start.split(':').map(n=>parseInt(n,10));
  const [eh, em] = end.split(':').map(n=>parseInt(n,10));
  let t = sh*60+sm; const endMin = eh*60+em;
  for (; t <= endMin; t += step) {
    const h = String(Math.floor(t/60)).padStart(2,'0');
    const m = String(t%60).padStart(2,'0');
    out.push(`${h}:${m}`);
  }
  return out;
}

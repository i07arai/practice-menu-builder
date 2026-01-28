
// 簡易JPGエクスポート：Canvasに描画してDataURLを返す
export function drawJPG(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#ffffff'; 
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 56px system-ui';
  ctx.fillText('タイムスケジュール', 50, 80);
  
  // Date info
  if (state.session.date) {
    ctx.font = '32px system-ui';
    ctx.fillStyle = '#666666';
    ctx.fillText(state.session.date, 50, 130);
    ctx.fillStyle = '#000000';
  }

  // Lane headers with time column spacer
  const timeColWidth = 120;
  const laneW = Math.floor((width - timeColWidth - 80) / 3);
  const startY = 160;
  const headerH = 80;
  const leftX = timeColWidth;
  const lanes = ['global','lane1','lane2'];
  
  lanes.forEach((id, i) => {
    const name = state.lanesById[id].name;
    const x = leftX + i * laneW;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, startY, laneW, headerH);
    ctx.font = 'bold 40px system-ui';
    ctx.fillStyle = '#000000';
    const textWidth = ctx.measureText(name).width;
    ctx.fillText(name, x + (laneW - textWidth) / 2, startY + 52);
  });

  // Time grid
  const step = state.timeStepMin; // 15
  const gridTop = startY + headerH + 10;
  const gridBottom = height - 100;
  const gridHeight = gridBottom - gridTop;
  const rowPx = 60; // per 15 min (same as UI)
  
  // Determine time range
  const startTime = state.session.start || '09:00';
  const endTime = state.session.end || '12:00';
  const times = enumerateTimes(startTime, endTime, step);

  // Draw time labels and horizontal lines
  ctx.font = '32px system-ui';
  times.forEach((t, idx) => {
    const y = gridTop + idx * rowPx;
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.beginPath(); 
    ctx.moveTo(leftX, y); 
    ctx.lineTo(width - 50, y); 
    ctx.stroke();
    
    if (idx % 2 === 0) { 
      ctx.fillStyle = '#666666'; 
      ctx.fillText(t, 30, y + 24); 
      ctx.fillStyle = '#000000'; 
    }
  });

  // Draw blocks per lane
  state.blocks.forEach(b => {
    const laneIndex = b.laneId === 'global' ? 0 : (b.laneId === 'lane1' ? 1 : 2);
    const x = leftX + laneIndex * laneW + 2;
    const topIdx = times.indexOf(b.start);
    if (topIdx === -1) return; // Skip if time not found
    
    const y = gridTop + topIdx * rowPx + 2;
    const h = Math.max(rowPx - 4, Math.round(b.durationMin / step) * rowPx - 4);
    
    // Draw block background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, laneW - 4, h);
    
    // Draw block border
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, laneW - 4, h);
    
    // Draw text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px system-ui';
    
    // Word wrap for title
    const maxWidth = laneW - 24;
    const words = b.title.split('');
    let line = '';
    let yOffset = y + 42;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x + 12, yOffset);
        line = words[i];
        yOffset += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x + 12, yOffset);
    
    // Draw duration
    ctx.font = '28px system-ui';
    ctx.fillStyle = '#666666'; 
    ctx.fillText(`${b.durationMin}分`, x + 12, yOffset + 38);
    ctx.fillStyle = '#000000';
  });

  return canvas.toDataURL('image/jpeg', 0.95);
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

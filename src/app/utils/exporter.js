
// 簡易JPGエクスポート：Canvasに描画してDataURLを返す
import { MENUS } from '../logic/menus.js';

// カテゴリごとの色定義
const CATEGORY_COLORS = {
  'warmup': '#ffdcc0',
  'pitching': '#ffcdde',
  'fielding': '#c0dfff',
  'batting': '#caedbc'
};

// 角丸四角形を描画するヘルパー関数
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawJPG(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#ffffff'; 
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 56px system-ui';
  
  // タイトル：スケジュール＠練習場所
  let title = 'スケジュール';
  if (state.session.location) {
    title += `＠${state.session.location}`;
  }
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, (width - titleWidth) / 2, 80);
  
  // Date info
  if (state.session.date) {
    ctx.font = '32px system-ui';
    ctx.fillStyle = '#666666';
    const dateWidth = ctx.measureText(state.session.date).width;
    ctx.fillText(state.session.date, (width - dateWidth) / 2, 130);
    ctx.fillStyle = '#000000';
  }

  // Determine which lanes have blocks
  const lanesWithBlocks = {
    global: state.blocks.some(b => b.laneId === 'global'),
    lane1: state.blocks.some(b => b.laneId === 'lane1'),
    lane2: state.blocks.some(b => b.laneId === 'lane2')
  };
  
  // Determine visible lanes
  let visibleLanes = [];
  if (!lanesWithBlocks.lane1 && !lanesWithBlocks.lane2) {
    // 全体レーンのみ
    visibleLanes = ['global'];
  } else if (lanesWithBlocks.lane1 && !lanesWithBlocks.lane2) {
    // 全体と他1のみ
    visibleLanes = ['global', 'lane1'];
  } else if (!lanesWithBlocks.lane1 && lanesWithBlocks.lane2) {
    // 全体と他2のみ
    visibleLanes = ['global', 'lane2'];
  } else {
    // すべて表示
    visibleLanes = ['global', 'lane1', 'lane2'];
  }
  
  // Lane headers with time column spacer
  const timeColWidth = 120;
  const laneCount = visibleLanes.length;
  const laneW = Math.floor((width - timeColWidth - 80) / laneCount);
  const startY = 160;
  const headerH = 80;
  const leftX = timeColWidth;
  
  visibleLanes.forEach((id, i) => {
    const name = state.lanesById[id].name;
    const x = leftX + i * laneW;
    
    // 角丸四角形の枠線を描画
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    roundRect(ctx, x, startY, laneW, headerH, 10);
    ctx.stroke();
    
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
  const rowPx = 120; // per 15 min (doubled for better visibility)
  
  // Determine time range
  const startTime = state.session.start || '09:00';
  const endTime = state.session.end || '12:00';
  const times = enumerateTimes(startTime, endTime, step);

  // Draw time labels and horizontal lines
  ctx.font = '32px system-ui';
  times.forEach((t, idx) => {
    const y = gridTop + idx * rowPx;
    
    // 30分ごと（偶数インデックス）は実線、15分ごと（奇数）は点線
    if (idx % 2 === 0) {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#d9d9d9';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath(); 
    ctx.moveTo(leftX, y); 
    ctx.lineTo(width - 50, y); 
    ctx.stroke();
    ctx.setLineDash([]); // リセット
    
    if (idx % 2 === 0) { 
      ctx.fillStyle = '#666666'; 
      ctx.fillText(t, 30, y + 24); 
      ctx.fillStyle = '#000000'; 
    }
  });

  // Draw blocks per lane
  state.blocks.forEach(b => {
    const laneIndex = visibleLanes.indexOf(b.laneId);
    if (laneIndex === -1) return; // Skip if lane is not visible
    const x = leftX + laneIndex * laneW + 2;
    const topIdx = times.indexOf(b.start);
    if (topIdx === -1) return; // Skip if time not found
    
    const y = gridTop + topIdx * rowPx + 2;
    const h = Math.max(rowPx - 4, Math.round(b.durationMin / step) * rowPx - 4);
    
    // メニュー情報からカテゴリを取得
    const menu = MENUS.find(m => m.id === b.menuId);
    const bgColor = menu && CATEGORY_COLORS[menu.category] ? CATEGORY_COLORS[menu.category] : '#ffffff';
    
    // Draw block background with rounded corners
    ctx.fillStyle = bgColor;
    roundRect(ctx, x, y, laneW - 4, h, 8);
    ctx.fill();
    
    // Draw block border with rounded corners
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, laneW - 4, h, 8);
    ctx.stroke();
    
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

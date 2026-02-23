
import { drawJPG } from '../utils/exporter.js';
import { MENUS } from '../logic/menus.js';

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

  ['global', 'lane1', 'lane2'].forEach((laneId, laneIndex) => {
    const col = document.createElement('div');
    col.className = 'grid-col';
    col.style.position = 'relative';
    col.style.borderLeft = '1px solid #d9d9d9';
    col.dataset.laneId = laneId;

    // Add horizontal lines for each time slot
    times.forEach((t, idx) => {
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.top = `${idx * rowHeight(step)}px`;
      line.style.left = '0';
      line.style.right = '0';
      line.style.height = '1px';

      // 30分ごと（偶数インデックス）は実線、15分ごと（奇数）は点線
      if (idx % 2 === 0) {
        line.style.borderTop = '1px solid #d9d9d9';
      } else {
        line.style.borderTop = '1px dashed #e9ecef';
      }
      line.style.pointerEvents = 'none';
      col.appendChild(line);
    });

    // Render blocks for this lane
    const blocks = state.blocks.filter(b => b.laneId === laneId);
    console.log(`Lane: ${laneId}, Blocks: ${blocks.length}`, blocks); // デバッグ
    blocks.forEach((b, idx) => {
      console.log(`Block data:`, b); // ブロックデータ全体を出力
      const el = document.createElement('div');
      const menu = MENUS.find(m => m.id === b.menuId);
      console.log(`menuId: ${b.menuId}, found menu:`, menu); // menuIdと検索結果
      const categoryClass = menu ? `block-${menu.category}` : '';
      console.log(`Category class: '${categoryClass}', Full className: 'block ${categoryClass}'`); // クラス名を確認
      el.className = `block ${categoryClass}`.trim();
      el.style.cursor = 'move';
      el.draggable = false;
      const top = positionFromTime(times, b.start, step);
      const height = (b.durationMin / step) * rowHeight(step);
      el.style.top = `${top}px`;
      el.style.height = `${height}px`;
      el.innerHTML = `<div class="title">${b.title}</div><div class="sub">${b.durationMin}分</div><div class="resize-handle"></div>`;

      // Cache DOM elements
      const subDiv = el.querySelector('.sub');

      // Drag and drop functionality (mouse and touch)
      let isDragging = false;
      let isResizing = false;
      let dragStartTime = 0;
      let startX, startY, startTop, startHeight;

      const handleStart = (clientX, clientY, target) => {
        dragStartTime = Date.now();
        startX = clientX;
        startY = clientY;
        startTop = el.offsetTop;
        startHeight = el.offsetHeight;

        // Check if clicking on resize handle
        if (target && target.classList.contains('resize-handle')) {
          isResizing = true;
          el.style.transition = 'none';
          el.style.willChange = 'height';
        }
      };

      const handleMove = (clientX, clientY) => {
        if (isResizing) {
          // Resize mode
          const deltaY = clientY - startY;
          const newHeight = Math.max(rowHeight(step), startHeight + deltaY);
          el.style.height = `${newHeight}px`;

          // Update duration display
          const newDuration = Math.round(newHeight / rowHeight(step)) * step;
          if (subDiv) {
            subDiv.textContent = `${newDuration}分`;
          }
        } else if (!isDragging && (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5)) {
          isDragging = true;
          el.style.transition = 'none';
          el.style.willChange = 'top, opacity';
          el.style.opacity = '0.7';
          el.style.zIndex = '1000';
        }

        if (isDragging) {
          const deltaY = clientY - startY;
          el.style.top = `${startTop + deltaY}px`;

          // Highlight target lane
          const wrapperRect = wrapper.getBoundingClientRect();
          const relativeX = clientX - wrapperRect.left;
          const timeColWidth = 64;
          const laneWidth = (wrapperRect.width - timeColWidth) / 3;
          const targetLaneIndex = Math.floor((relativeX - timeColWidth) / laneWidth);
          const lanes = ['global', 'lane1', 'lane2'];
          const targetLaneId = lanes[Math.max(0, Math.min(2, targetLaneIndex))];

          // Remove highlight from all lanes and existing preview
          wrapper.querySelectorAll('.grid-col').forEach(c => c.classList.remove('drag-target'));
          const existingPreview = wrapper.querySelector('.drag-preview');
          if (existingPreview) existingPreview.remove();

          // Add highlight to target lane
          const targetCol = wrapper.querySelector(`.grid-col[data-lane-id="${targetLaneId}"]`);
          if (targetCol) {
            targetCol.classList.add('drag-target');

            // Calculate preview position using current Y position
            const colRect = targetCol.getBoundingClientRect();
            const blockTop = clientY - colRect.top + targetCol.parentElement.scrollTop;
            const newTimeIndex = Math.max(0, Math.round(blockTop / rowHeight(step)));
            const newTime = times[Math.min(newTimeIndex, times.length - 1)];
            const topPx = positionFromTime(times, newTime, step);

            // Create preview shadow
            const preview = document.createElement('div');
            preview.className = 'drag-preview';
            preview.style.position = 'absolute';
            preview.style.left = '1px';
            preview.style.right = '0';
            preview.style.top = `${topPx}px`;
            preview.style.height = `${rowHeight(step) * (b.durationMin / step)}px`;
            preview.style.border = '2px dashed rgba(16, 98, 135, 0.5)';
            preview.style.borderRadius = '6px';
            preview.style.background = 'rgba(16, 98, 135, 0.1)';
            preview.style.pointerEvents = 'none';
            preview.style.zIndex = '999';

            // Add time label to preview
            const timeLabel = document.createElement('div');
            timeLabel.textContent = `${newTime}〜`;
            timeLabel.style.fontSize = '11px';
            timeLabel.style.color = 'var(--primary)';
            timeLabel.style.fontWeight = '600';
            timeLabel.style.padding = '4px';
            preview.appendChild(timeLabel);

            targetCol.appendChild(preview);
          }
        }
      };

      const handleEnd = (clientX, clientY) => {
        if (isResizing) {
          // Update block duration
          const newHeight = parseInt(el.style.height);
          const newDuration = Math.round(newHeight / rowHeight(step)) * step;
          b.durationMin = Math.max(step, newDuration);

          el.style.transition = '';
          el.style.willChange = '';
          renderGrid(state);
          isResizing = false;
        } else if (isDragging) {
          // Calculate new position
          const wrapperRect = wrapper.getBoundingClientRect();
          const relativeX = clientX - wrapperRect.left;

          // Determine target lane
          const timeColWidth = 64;
          const laneWidth = (wrapperRect.width - timeColWidth) / 3;
          const targetLaneIndex = Math.floor((relativeX - timeColWidth) / laneWidth);
          const lanes = ['global', 'lane1', 'lane2'];
          const targetLaneId = lanes[Math.max(0, Math.min(2, targetLaneIndex))];

          // Calculate new time
          const colTop = wrapper.querySelector('.grid-col').getBoundingClientRect().top;
          const blockTop = clientY - colTop + wrapper.scrollTop;
          const newTimeIndex = Math.max(0, Math.round(blockTop / rowHeight(step)));
          const newTime = times[Math.min(newTimeIndex, times.length - 1)];

          // Update block
          b.laneId = targetLaneId;
          b.start = newTime;

          renderGrid(state);
        } else if (Date.now() - dragStartTime < 300) {
          // Quick click/tap - show delete dialog
          openDeleteConfirm(state, b, () => {
            renderGrid(state);
          });
        }

        if (isDragging || isResizing) {
          el.style.transition = '';
          el.style.willChange = '';
        }

        // Remove lane highlight
        wrapper.querySelectorAll('.grid-col').forEach(c => c.classList.remove('drag-target'));
        const existingPreview = wrapper.querySelector('.drag-preview');
        if (existingPreview) existingPreview.remove();

        el.style.opacity = '1';
        el.style.zIndex = 'auto';
        isDragging = false;
      };

      // Mouse events
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY, e.target);

        const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
        const onMouseUp = (e) => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          handleEnd(e.clientX, e.clientY);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // Touch events
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY, e.target);

        const onTouchMove = (e) => {
          const touch = e.touches[0];
          handleMove(touch.clientX, touch.clientY);
        };
        const onTouchEnd = (e) => {
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend', onTouchEnd);
          const touch = e.changedTouches[0];
          handleEnd(touch.clientX, touch.clientY);
        };

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
      });

      col.appendChild(el);
    });
    wrapper.appendChild(col);
  });

  host.appendChild(wrapper);
}

function rowHeight(step) { return step === 15 ? 60 : 60; }
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(x => parseInt(x, 10));
  return h * 60 + m;
}
function enumerateTimes(start, end, step) {
  const times = [];
  const [sh, sm] = start.split(':').map(x => parseInt(x, 10));
  const [eh, em] = end.split(':').map(x => parseInt(x, 10));
  let totalStart = sh * 60 + sm;
  const totalEnd = eh * 60 + em;
  for (let t = totalStart; t <= totalEnd; t += step) {
    const h = Math.floor(t / 60);
    const m = String(t % 60).padStart(2, '0');
    times.push(`${String(h).padStart(2, '0')}:${m}`);
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
  const lanes = ['global', 'lane1', 'lane2'];
  lanes.forEach(id => {
    const l = state.lanesById[id];
    const label = document.createElement('label');
    label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '12px'; label.style.marginBottom = '10px';
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
export function openTimePicker(state, defaultDuration, onDone, laneId = null) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-time');
  const startInput = document.getElementById('pick-start');
  const durInput = document.getElementById('pick-duration');
  durInput.value = String(defaultDuration || 20);

  // Calculate suggested start time
  let suggestedStart = state.session.start || '09:00';

  if (laneId) {
    // Find the last block in the selected lane
    const laneBlocks = state.blocks.filter(b => b.laneId === laneId);
    if (laneBlocks.length > 0) {
      // Find the block with the latest end time
      let latestEndTime = null;
      let latestEndMinutes = -1;

      laneBlocks.forEach(block => {
        const [h, m] = block.start.split(':').map(n => parseInt(n, 10));
        const startMinutes = h * 60 + m;
        const endMinutes = startMinutes + block.durationMin;

        if (endMinutes > latestEndMinutes) {
          latestEndMinutes = endMinutes;
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          latestEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        }
      });

      if (latestEndTime) {
        suggestedStart = latestEndTime;
      }
    }
  }

  startInput.value = suggestedStart;

  const ok = document.getElementById('time-ok');
  const cancel = document.getElementById('time-cancel');
  backdrop.hidden = false; modal.hidden = false;
  ok.onclick = () => {
    const start = startInput.value || '09:00';
    const dur = Math.max(5, parseInt(durInput.value || '15', 10));
    backdrop.hidden = true; modal.hidden = true;
    onDone(start, dur);
  };
  cancel.onclick = () => { backdrop.hidden = true; modal.hidden = true; };
}

// Time picker modal for editing (start time is fixed)
export function openTimePickerForEdit(state, currentStart, currentDuration, onDone) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-time');
  const startInput = document.getElementById('pick-start');
  const durInput = document.getElementById('pick-duration');

  // 開始時間を固定し、読み取り専用に
  startInput.value = currentStart;
  startInput.readOnly = true;
  startInput.style.backgroundColor = '#f0f0f0';

  durInput.value = String(currentDuration);

  const ok = document.getElementById('time-ok');
  const cancel = document.getElementById('time-cancel');
  backdrop.hidden = false; modal.hidden = false;

  ok.onclick = () => {
    const dur = Math.max(5, parseInt(durInput.value || '15', 10));
    backdrop.hidden = true; modal.hidden = true;
    // 開始時間は変更せず、所要時間だけ変更
    onDone(currentStart, dur);

    // リセット
    startInput.readOnly = false;
    startInput.style.backgroundColor = '';
  };

  cancel.onclick = () => {
    backdrop.hidden = true; modal.hidden = true;
    // リセット
    startInput.readOnly = false;
    startInput.style.backgroundColor = '';
  };
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
  ok.onclick = () => { const v = input.value.trim(); if (v.length < 1 || v.length > 20) return; backdrop.hidden = true; modal.hidden = true; onSave(v); };
  cancel.onclick = () => { backdrop.hidden = true; modal.hidden = true; };
  reset.onclick = () => { backdrop.hidden = true; modal.hidden = true; onReset(); };
}

// Export to JPG (1080x1920 - doubled row spacing)
export function exportScheduleAsJPG(state) {
  const btnExport = document.getElementById('btn-export-jpg');
  if (!btnExport) return;

  btnExport.addEventListener('click', () => {
    // 重複チェック
    const overlaps = findOverlappingBlocks(state);
    if (overlaps.length > 0) {
      let message = '予定が重複しています。JPEG出力できません。\n\n重複箇所：\n';
      overlaps.forEach((overlap, index) => {
        const laneName = state.lanesById[overlap.laneId].name;
        message += `${index + 1}. ${laneName}: 「${overlap.block1.title}」と「${overlap.block2.title}」\n`;
        message += `   ${overlap.block1.start}～(${overlap.block1.durationMin}分) と ${overlap.block2.start}～(${overlap.block2.durationMin}分)\n`;
      });
      showAlert('JPEG出力エラー', message);
      return;
    }

    const width = 1080, height = 1920;
    const dataUrl = drawJPG(state, width, height);
    const a = document.createElement('a');

    // Format filename: YYYY年MM月DD日 練習スケジュール.jpg
    let filename = '練習スケジュール.jpg';
    if (state.session.date) {
      const [year, month, day] = state.session.date.split('-');
      filename = `${year}年${month}月${day}日 練習スケジュール.jpg`;
    }

    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  });
}

// 重複チェック関数（詳細情報を返す）
function findOverlappingBlocks(state) {
  const overlaps = [];
  const lanes = ['global', 'lane1', 'lane2'];

  for (const laneId of lanes) {
    const laneBlocks = state.blocks.filter(b => b.laneId === laneId);

    // ブロックを時間順にソート
    laneBlocks.sort((a, b) => {
      const [ah, am] = a.start.split(':').map(n => parseInt(n, 10));
      const [bh, bm] = b.start.split(':').map(n => parseInt(n, 10));
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    // 隣接するブロックをチェック
    for (let i = 0; i < laneBlocks.length - 1; i++) {
      const current = laneBlocks[i];
      const next = laneBlocks[i + 1];

      const [ch, cm] = current.start.split(':').map(n => parseInt(n, 10));
      const currentEnd = ch * 60 + cm + current.durationMin;

      const [nh, nm] = next.start.split(':').map(n => parseInt(n, 10));
      const nextStart = nh * 60 + nm;

      if (currentEnd > nextStart) {
        overlaps.push({
          laneId,
          block1: current,
          block2: next
        });
      }
    }
  }

  return overlaps;
}

// Delete confirmation modal
export function openDeleteConfirm(state, block, onDeleted) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-delete');
  const message = document.getElementById('delete-message');
  const ok = document.getElementById('delete-ok');
  const cancel = document.getElementById('delete-cancel');

  message.textContent = `「${block.title}」（${block.start}〜、${block.durationMin}分）`;
  backdrop.hidden = false; modal.hidden = false;

  ok.onclick = () => {
    const index = state.blocks.indexOf(block);
    if (index > -1) {
      state.blocks.splice(index, 1);
    }
    backdrop.hidden = true; modal.hidden = true;
    onDeleted();
  };

  cancel.onclick = () => {
    backdrop.hidden = true; modal.hidden = true;
  };
}

// カスタムアラートモーダル
function showAlert(title, message) {
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('modal-alert');
  const titleEl = document.getElementById('alert-title');
  const messageEl = document.getElementById('alert-message');
  const okBtn = document.getElementById('alert-ok');

  titleEl.textContent = title;
  messageEl.textContent = message;
  backdrop.hidden = false;
  modal.hidden = false;

  okBtn.onclick = () => {
    backdrop.hidden = true;
    modal.hidden = true;
  };

  // Enterキーでも閉じられるように
  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      backdrop.hidden = true;
      modal.hidden = true;
      document.removeEventListener('keydown', handleEnter);
    }
  };
  document.addEventListener('keydown', handleEnter);
}

// プレビュー機能：新しいウィンドウでスケジュールを表示
export function previewSchedule(state) {
  const btnPreview = document.getElementById('btn-preview');
  if (!btnPreview) return;

  btnPreview.addEventListener('click', () => {
    // HTML生成
    const html = generatePreviewHTML(state);

    // 新しいウィンドウを開く
    const previewWindow = window.open('', 'SchedulePreview', 'width=1080,height=1920,menubar=no,toolbar=no,location=no');

    if (previewWindow) {
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } else {
      showAlert('プレビューエラー', 'ポップアップがブロックされました。ブラウザの設定を確認してください。');
    }
  });
}

// プレビュー用HTML生成
function generatePreviewHTML(state) {
  // 表示するレーンを決定
  const lanesWithBlocks = {
    global: state.blocks.some(b => b.laneId === 'global'),
    lane1: state.blocks.some(b => b.laneId === 'lane1'),
    lane2: state.blocks.some(b => b.laneId === 'lane2')
  };

  let visibleLanes = [];
  if (!lanesWithBlocks.lane1 && !lanesWithBlocks.lane2) {
    visibleLanes = ['global'];
  } else if (lanesWithBlocks.lane1 && !lanesWithBlocks.lane2) {
    visibleLanes = ['global', 'lane1'];
  } else if (!lanesWithBlocks.lane1 && lanesWithBlocks.lane2) {
    visibleLanes = ['global', 'lane2'];
  } else {
    visibleLanes = ['global', 'lane1', 'lane2'];
  }

  // タイトル生成
  let title = 'スケジュール';
  if (state.session.location) {
    title += `＠${state.session.location}`;
  }

  // 日時情報
  let dateTimeInfo = '';
  if (state.session.date) {
    const dateStr = state.session.date.replace(/-/g, '/');
    const startTime = state.session.start || '';
    const endTime = state.session.end || '';
    dateTimeInfo = `日時:${dateStr} ${startTime}～${endTime}`;
  }

  // 時間範囲
  const startTime = state.session.start || '09:00';
  const endTime = state.session.end || '12:00';
  const step = state.timeStepMin;
  const times = enumerateTimes(startTime, endTime, step);

  // レーンのヘッダー生成
  let laneHeaders = '';
  visibleLanes.forEach(id => {
    const name = state.lanesById[id].name;
    laneHeaders += `<div class="lane-header">${name}</div>`;
  });

  // グリッド列数（時間列 + レーン数）
  const gridColumns = `60px repeat(${visibleLanes.length}, 1fr)`;

  // グリッド行生成
  let gridRows = '';
  times.forEach((t, idx) => {
    const isMainLine = idx % 2 === 0;
    const timeLabel = isMainLine ? `<div class="time-label">${t}</div>` : '<div class="time-label"></div>';

    let rowCells = timeLabel;
    visibleLanes.forEach(laneId => {
      rowCells += `<div class="grid-cell ${isMainLine ? 'main-line' : 'sub-line'}"></div>`;
    });

    gridRows += `<div class="grid-row">${rowCells}</div>`;
  });

  // ブロック生成
  let blocks = '';
  state.blocks.forEach(b => {
    const laneIndex = visibleLanes.indexOf(b.laneId);
    if (laneIndex === -1) return;

    const topIdx = times.indexOf(b.start);
    if (topIdx === -1) return;

    const menu = MENUS.find(m => m.id === b.menuId);
    const categoryClass = menu ? `block-${menu.category}` : '';

    const rowSpan = Math.max(1, Math.round(b.durationMin / step));

    blocks += `
      <div class="schedule-block ${categoryClass}" style="
        grid-column: ${laneIndex + 2};
        grid-row: ${topIdx + 1} / span ${rowSpan};
      ">
        <div class="block-title">${b.title}</div>
        <div class="block-duration">${b.durationMin}分</div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>スケジュールプレビュー</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: white;
      padding: 40px 20px;
      max-width: 1080px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .title {
      font-size: 42px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .date-time {
      font-size: 32px;
      color: #666;
    }

    .lane-headers {
      display: grid;
      grid-template-columns: ${gridColumns};
      gap: 0;
      margin-bottom: 10px;
    }

    .lane-headers > div:first-child {
      /* 時間列のスペーサー */
    }

    .lane-header {
      border: 2px solid #000;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      font-weight: bold;
      font-size: 28px;
      background: white;
    }

    .schedule-grid {
      position: relative;
      display: grid;
      grid-template-columns: ${gridColumns};
      grid-template-rows: repeat(${times.length}, 60px);
      gap: 0;
    }

    .grid-row {
      display: contents;
    }

    .time-label {
      font-size: 22px;
      color: #666;
      padding: 8px 5px;
      text-align: right;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .grid-cell {
      border-left: 1px solid #ccc;
      height: 60px;
      position: relative;
    }

    .grid-cell.main-line {
      border-top: 1px solid #ccc;
    }

    .grid-cell.sub-line {
      border-top: 1px dashed #e0e0e0;
    }

    .schedule-block {
      border: 2px solid #000;
      border-radius: 8px;
      padding: 10px;
      position: relative;
      z-index: 1;
      margin: 2px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .block-warmup {
      background-color: #ffdcc0;
    }

    .block-pitching {
      background-color: #ffcdde;
    }

    .block-fielding {
      background-color: #c0dfff;
    }

    .block-batting {
      background-color: #caedbc;
    }

    .block-other {
      background-color: #f0f0f0;
    }

    .block-title {
      font-size: 24px;
      font-weight: bold;
      word-break: break-all;
      margin-bottom: 5px;
    }

    .block-duration {
      font-size: 20px;
      color: #666;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${title}</div>
    <div class="date-time">${dateTimeInfo}</div>
  </div>

  <div class="lane-headers">
    <div></div>
    ${laneHeaders}
  </div>

  <div class="schedule-grid">
    ${gridRows}
    ${blocks}
  </div>
</body>
</html>`;
}

// enumerateTimes helper（exporter.jsから複製）
function enumerateTimes(start, end, step) {
  const out = [];
  const [sh, sm] = start.split(':').map(n => parseInt(n, 10));
  const [eh, em] = end.split(':').map(n => parseInt(n, 10));
  let t = sh * 60 + sm;
  const endMin = eh * 60 + em;
  for (; t <= endMin; t += step) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    out.push(`${h}:${m}`);
  }
  return out;
}

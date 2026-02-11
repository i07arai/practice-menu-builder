
import { AppState, nextFutureSundayYMD } from './utils/state.js';
import { MENUS, isEligible, loadMenuConfig } from './logic/menus.js';
import { getRoster, loadRosterConfig } from './logic/roster.js';
import { renderMenuList } from './ui/menuPanel.js';
import { renderGrid, addBlockToSchedule, exportScheduleAsJPG, openLanePicker, openTimePicker, openRenameLane } from './ui/scheduleView.js';

const state = new AppState();

// --- Initialize session date (next future Sunday) ---
const dateInput = document.getElementById('input-date');
const startInput = document.getElementById('input-start');
const endInput = document.getElementById('input-end');

function initDate() {
  const ymd = nextFutureSundayYMD();
  state.session.date = ymd;
  dateInput.value = ymd;
}
initDate();

// Start/End default times
startInput.value = '09:00';
endInput.value = '11:00';
state.session.start = '09:00';
state.session.end = '11:00';

// Bind session inputs
dateInput.addEventListener('change', (e) => {
  state.session.date = e.target.value;
});
startInput.addEventListener('change', (e) => {
  // 現在の開始時間と終了時間の差分（分）を計算
  const oldStart = state.session.start || '09:00';
  const oldEnd = state.session.end || '11:00';
  const [oldStartH, oldStartM] = oldStart.split(':').map(Number);
  const [oldEndH, oldEndM] = oldEnd.split(':').map(Number);
  const durationMin = (oldEndH * 60 + oldEndM) - (oldStartH * 60 + oldStartM);

  // 新しい開始時間を設定
  const newStart = e.target.value;
  state.session.start = newStart;

  // 新しい終了時間を計算（開始時間 + 差分）
  const [newStartH, newStartM] = newStart.split(':').map(Number);
  const newEndTotalMin = (newStartH * 60 + newStartM) + durationMin;
  const newEndH = Math.floor(newEndTotalMin / 60);
  const newEndM = newEndTotalMin % 60;
  const newEnd = `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`;

  // 終了時間を更新
  state.session.end = newEnd;
  endInput.value = newEnd;

  renderGrid(state);
});
endInput.addEventListener('change', (e) => {
  state.session.end = e.target.value;
  renderGrid(state);
});

// Location inputs
const locationSelect = document.getElementById('location-select');
const locationText = document.getElementById('location-text');

// Initialize location
state.session.location = locationSelect.value;

locationSelect.addEventListener('change', (e) => {
  if (e.target.value === 'その他') {
    locationText.style.display = 'block';
    locationText.focus();
    state.session.location = locationText.value || '';
  } else {
    locationText.style.display = 'none';
    state.session.location = e.target.value;
  }
});

locationText.addEventListener('input', (e) => {
  state.session.location = e.target.value;
});

// Count mode selector (roster vs position)
const countModeSelect = document.getElementById('count-mode-select');
const rosterInput = document.getElementById('roster-input');
const positionInput = document.getElementById('position-input');
const rosterCountDisplay = document.getElementById('roster-count');

console.log('DOM elements:', {
  countModeSelect,
  rosterInput,
  positionInput,
  rosterCountDisplay
});

// Initialize: show roster input by default
let countMode = 'roster';
if (rosterInput && positionInput) {
  rosterInput.style.display = 'block';
  positionInput.style.display = 'none';
}

countModeSelect.addEventListener('change', (e) => {
  countMode = e.target.value;
  if (countMode === 'roster') {
    rosterInput.style.display = 'block';
    positionInput.style.display = 'none';
    updateRosterCount();
  } else {
    rosterInput.style.display = 'none';
    positionInput.style.display = 'block';
  }
  updateMenuCandidates();
});

// Render roster UI from config
function renderRosterUI() {
  const roster = getRoster();
  const rosterGrid = document.querySelector('.roster-grid');

  if (!rosterGrid) return;
  if (roster.length === 0) {
    rosterGrid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">名簿データがありません</p>';
    return;
  }

  rosterGrid.innerHTML = '';

  roster.forEach((player) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.playerId = player.id;
    checkbox.dataset.name = player.name;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + player.name));
    rosterGrid.appendChild(label);

    checkbox.addEventListener('change', () => {
      updateRosterCount();
      updateMenuCandidates();
    });
  });
}

function updateRosterCount() {
  if (!rosterInput || !rosterCountDisplay) {
    console.warn('rosterInput or rosterCountDisplay not found');
    return;
  }

  const rosterCheckboxes = rosterInput.querySelectorAll('input[type="checkbox"]');
  const checkedBoxes = Array.from(rosterCheckboxes).filter(cb => cb.checked);
  const checkedCount = checkedBoxes.length;
  rosterCountDisplay.textContent = checkedCount;

  // Update state.counts for menu filtering
  // When in roster mode, calculate actual position counts from selected members
  if (countMode === 'roster') {
    // Get selected player IDs
    const selectedPlayerIds = checkedBoxes.map(cb => parseInt(cb.dataset.playerId));
    const roster = getRoster();

    // Calculate position counts from selected players
    let pCount = 0;
    let ifCount = 0;
    let ofCount = 0;
    const skillCounts = {};
    let canCatchCount = 0;

    selectedPlayerIds.forEach(playerId => {
      const player = roster.find(p => p.id === playerId);
      if (!player) return;

      // Count main position
      if (player.position === 'P') pCount++;
      else if (player.position === 'IF') ifCount++;
      else if (player.position === 'OF') ofCount++;

      // Count sub positions (if any)
      if (player.subPositions && Array.isArray(player.subPositions)) {
        player.subPositions.forEach(pos => {
          if (pos === 'P') pCount++;
          else if (pos === 'IF') ifCount++;
          else if (pos === 'OF') ofCount++;
        });
      }

      // Count skills
      if (player.attributes?.skills && Array.isArray(player.attributes.skills)) {
        player.attributes.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }

      // Count canCatch
      if (player.attributes?.canCatch === true) {
        canCatchCount++;
      }
    });

    state.counts.P = pCount;
    state.counts.IF = ifCount;
    state.counts.OF = ofCount;
    // 合計人数（positionがnullの人も含む）
    state.counts.total = checkedCount;
    // スキルカウント（名簿モードのみ）
    state.counts.skills = skillCounts;
    // キャッチャー可能人数（名簿モードのみ）
    state.counts.canCatch = canCatchCount;
  }
}

// Toggle counts section
const countsToggle = document.getElementById('counts-toggle');
const countsContainer = document.getElementById('counts-container');
if (countsToggle) {
  countsToggle.addEventListener('click', () => {
    countsToggle.classList.toggle('open');
    countsContainer.classList.toggle('open');
  });
}

// Counts inputs and +/- buttons
['P','IF','OF'].forEach(role => {
  const display = document.getElementById(`count-${role}`);

  // Click to show selector
  display.addEventListener('click', (e) => {
    // Remove any existing selector
    document.querySelectorAll('.count-selector').forEach(s => s.remove());

    // Create selector menu
    const selector = document.createElement('div');
    selector.className = 'count-selector';

    // 1-9, then 0
    for (let i = 1; i <= 9; i++) {
      const item = document.createElement('div');
      item.className = 'count-selector-item';
      item.textContent = i;
      item.addEventListener('click', () => {
        display.textContent = i;
        state.counts[role] = i;
        updateMenuCandidates();
        selector.remove();
      });
      selector.appendChild(item);
    }
    // Add 0 at the end
    const item0 = document.createElement('div');
    item0.className = 'count-selector-item';
    item0.textContent = 0;
    item0.addEventListener('click', () => {
      display.textContent = 0;
      state.counts[role] = 0;
      updateMenuCandidates();
      selector.remove();
    });
    selector.appendChild(item0);

    // Position selector below the display
    const rect = display.getBoundingClientRect();
    selector.style.position = 'fixed';
    selector.style.top = `${rect.bottom + 4}px`;
    selector.style.left = `${rect.left}px`;
    selector.style.width = `${rect.width}px`;

    document.body.appendChild(selector);

    // Close on click outside
    const closeSelector = (ev) => {
      if (!selector.contains(ev.target) && ev.target !== display) {
        selector.remove();
        document.removeEventListener('click', closeSelector);
      }
    };
    setTimeout(() => document.addEventListener('click', closeSelector), 0);
  });

  // Plus button
  document.querySelectorAll(`.btn.plus[data-role="${role}"]`).forEach(btn => btn.addEventListener('click', () => {
    const current = Math.max(0, parseInt(display.textContent || '0', 10));
    const newVal = current + 1; // 上限なし
    display.textContent = String(newVal);
    state.counts[role] = newVal;
    updateMenuCandidates();
  }));

  // Minus button
  document.querySelectorAll(`.btn.minus[data-role="${role}"]`).forEach(btn => btn.addEventListener('click', () => {
    const current = Math.max(0, parseInt(display.textContent || '0', 10));
    const newVal = Math.max(0, current - 1);
    display.textContent = String(newVal);
    state.counts[role] = newVal;
    updateMenuCandidates();
  }));
});

// Category filter chips
const chips = document.querySelectorAll('.chip');
chips.forEach(ch => ch.addEventListener('click', () => {
  chips.forEach(c => c.classList.remove('active'));
  ch.classList.add('active');
  const cat = ch.dataset.cat;
  state.ui.filterCat = cat === 'all' ? null : cat;
  updateMenuCandidates();
}));

function updateMenuCandidates() {
  const list = MENUS.filter(m => isEligible(m, state.counts));
  const filtered = state.ui.filterCat ? list.filter(m => m.categoryShort === state.ui.filterCat) : list;
  renderMenuList(filtered, {
    onSelect: (menu) => {
      // 1) lane picker
      openLanePicker(state, (laneId) => {
        // 2) time picker (if start/end blank, still show picker)
        const defaultDuration = menu.durationDefaultMin;
        openTimePicker(state, defaultDuration, (startTime, durationMin) => {
          addBlockToSchedule(state, {
            menuId: menu.id,
            title: menu.name,
            laneId,
            start: startTime,
            durationMin,
          });
        }, laneId);
      });
    }
  });
}

// Lane rename buttons
['lane1','lane2'].forEach(laneId => {
  document.querySelector(`.edit-lane[data-lane="${laneId}"]`).addEventListener('click', () => {
    openRenameLane(state, laneId, (newName) => {
      state.renameLane(laneId, newName);
      document.getElementById(`lane-name-${laneId}`).textContent = state.lanesById[laneId].name;
    }, () => {
      state.resetLaneName(laneId);
      document.getElementById(`lane-name-${laneId}`).textContent = state.lanesById[laneId].name;
    });
  });
});

// Export button setup (delegated to scheduleView)
exportScheduleAsJPG(state);

// Help modal
const helpLink = document.getElementById('help-link');
const helpModal = document.getElementById('modal-help');
const helpBackdrop = document.getElementById('modal-backdrop');
const helpClose = document.getElementById('help-close');

// Purpose modal
const purposeLink = document.getElementById('purpose-link');
const purposeModal = document.getElementById('modal-purpose');
const purposeBack = document.getElementById('purpose-back');

console.log('Modal elements:', {
  helpLink,
  helpModal,
  helpBackdrop,
  helpClose,
  purposeLink,
  purposeModal,
  purposeBack
});

if (helpLink && helpModal && helpBackdrop && helpClose) {
  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    helpBackdrop.hidden = false;
    helpModal.hidden = false;
  });

  helpClose.addEventListener('click', () => {
    helpBackdrop.hidden = true;
    helpModal.hidden = true;
  });

  helpBackdrop.addEventListener('click', () => {
    if (!helpModal.hidden) {
      helpBackdrop.hidden = true;
      helpModal.hidden = true;
    }
    if (purposeModal && !purposeModal.hidden) {
      helpBackdrop.hidden = true;
      purposeModal.hidden = true;
    }
  });
} else {
  console.error('Some help modal elements not found');
}

if (purposeLink && purposeModal && helpModal && purposeBack) {
  purposeLink.addEventListener('click', (e) => {
    e.preventDefault();
    // 使い方モーダルを閉じて目的モーダルを開く
    helpModal.hidden = true;
    purposeModal.hidden = false;
  });

  purposeBack.addEventListener('click', () => {
    // 目的モーダルを閉じて使い方モーダルを開く
    purposeModal.hidden = true;
    helpModal.hidden = false;
  });
} else {
  console.error('Some purpose modal elements not found');
}

// 設定ファイルを読み込んでから初期化
async function initialize() {
  console.log('initialize() called');

  // メニュー設定を読み込み
  await loadMenuConfig();
  console.log('Menu config loaded');

  // 名簿設定を読み込み
  await loadRosterConfig();
  console.log('Roster config loaded');

  // 名簿UIを生成
  renderRosterUI();
  console.log('Roster UI rendered');

  // Initial render
  renderGrid(state);
  updateMenuCandidates();
}

// アプリケーションを初期化
initialize();

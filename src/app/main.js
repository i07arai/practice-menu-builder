
import { AppState, nextFutureSundayYMD } from './utils/state.js';
import { MENUS, isEligible, loadMenuConfig } from './logic/menus.js';
import { getRoster, loadRosterConfig } from './logic/roster.js';
import { renderMenuList } from './ui/menuPanel.js';
import { renderGrid, addBlockToSchedule, exportScheduleAsJPG, openLanePicker, openTimePicker, openRenameLane } from './ui/scheduleView.js';

const state = new AppState();

// 設定ファイルを読み込んでから初期化
async function initialize() {
  // メニュー設定を読み込み
  await loadMenuConfig();
  
  // 名簿設定を読み込み
  await loadRosterConfig();
  
  // 名簿UIを生成
  renderRosterUI();
  
  // Initial render
  renderGrid(state);
  updateMenuCandidates();
}

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

// Initialize: show roster input by default
let countMode = 'roster';
rosterInput.style.display = 'block';
positionInput.style.display = 'none';

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
  
  console.log('renderRosterUI called');
  console.log('Roster length:', roster.length);
  console.log('Roster grid element:', rosterGrid);
  
  if (!rosterGrid) {
    console.error('Roster grid not found!');
    return;
  }
  
  if (roster.length === 0) {
    console.warn('Roster is empty');
    return;
  }
  
  // Clear existing content
  rosterGrid.innerHTML = '';
  
  // Generate checkboxes from roster config
  roster.forEach((player) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.playerId = player.id;
    checkbox.dataset.name = player.name;
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + player.name));
    rosterGrid.appendChild(label);
    
    // Add change listener
    checkbox.addEventListener('change', () => {
      updateRosterCount();
      updateMenuCandidates();
    });
  });
}

function updateRosterCount() {
  const rosterCheckboxes = rosterInput.querySelectorAll('input[type="checkbox"]');
  const checkedCount = Array.from(rosterCheckboxes).filter(cb => cb.checked).length;
  rosterCountDisplay.textContent = checkedCount;
  
  // Update state.counts for menu filtering
  // When in roster mode, treat all checked as total count
  if (countMode === 'roster') {
    state.counts.P = Math.ceil(checkedCount / 3);  // Rough distribution
    state.counts.IF = Math.ceil(checkedCount / 3);
    state.counts.OF = Math.ceil(checkedCount / 3);
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
  if (!purposeModal.hidden) {
    helpBackdrop.hidden = true;
    purposeModal.hidden = true;
  }
});

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

// アプリケーションを初期化
initialize();


import { AppState, nextFutureSundayYMD } from './utils/state.js';
import { MENUS, isEligible } from './logic/menus.js';
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

// Start/End are initially blank
startInput.value = '';
endInput.value = '';

// Bind session inputs
dateInput.addEventListener('change', (e) => {
  state.session.date = e.target.value;
});
startInput.addEventListener('change', (e) => {
  state.session.start = e.target.value;
  renderGrid(state);
});
endInput.addEventListener('change', (e) => {
  state.session.end = e.target.value;
  renderGrid(state);
});

// Toggle counts section
const countsToggle = document.getElementById('counts-toggle');
const countsContainer = document.getElementById('counts-container');
countsToggle.addEventListener('click', () => {
  countsToggle.classList.toggle('open');
  countsContainer.classList.toggle('open');
});

// Counts inputs and +/- buttons
['P','IF','OF'].forEach(role => {
  const input = document.getElementById(`count-${role}`);
  input.addEventListener('input', () => {
    const v = Math.max(0, parseInt(input.value || '0', 10));
    state.counts[role] = v;
    updateMenuCandidates();
  });
  document.querySelectorAll(`.btn.plus[data-role="${role}"]`).forEach(btn => btn.addEventListener('click', () => {
    input.value = String(Math.max(0, parseInt(input.value || '0', 10)) + 1);
    const v = parseInt(input.value, 10); state.counts[role] = v; updateMenuCandidates();
  }));
  document.querySelectorAll(`.btn.minus[data-role="${role}"]`).forEach(btn => btn.addEventListener('click', () => {
    input.value = String(Math.max(0, parseInt(input.value || '0', 10) - 1));
    const v = parseInt(input.value, 10); state.counts[role] = v; updateMenuCandidates();
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

// Initial render
renderGrid(state);
updateMenuCandidates();

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

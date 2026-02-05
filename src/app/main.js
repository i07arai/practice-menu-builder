
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

// Location inputs
const locationSelect = document.getElementById('location-select');
const locationText = document.getElementById('location-text');

locationSelect.addEventListener('change', (e) => {
  if (e.target.value === '‚»‚Ì‘¼') {
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

// Toggle counts section
const countsToggle = document.getElementById('counts-toggle');
const countsContainer = document.getElementById('counts-container');
countsToggle.addEventListener('click', () => {
  countsToggle.classList.toggle('open');
  countsContainer.classList.toggle('open');
});

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
    
    for (let i = 0; i <= 9; i++) {
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
    const newVal = Math.min(9, current + 1);
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

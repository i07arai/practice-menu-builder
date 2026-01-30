
export class AppState {
  constructor() {
    this.session = { date: '', start: '', end: '' };
    this.counts = { P: 0, IF: 0, OF: 0 };
    this.ui = { filterCat: null };
    // lanes
    this.lanes = [
      { id: 'global', name: '全体', editable: false },
      { id: 'lane1', name: '他1', editable: true },
      { id: 'lane2', name: '他2', editable: true }
    ];
    this.lanesById = Object.fromEntries(this.lanes.map(l => [l.id, l]));
    // schedule blocks
    this.blocks = []; // {laneId, title, start, durationMin, menuId}
    this.timeStepMin = 15;
  }
  renameLane(laneId, newName) {
    const lane = this.lanesById[laneId];
    if (!lane || !lane.editable) return;
    const trimmed = (newName || '').trim();
    if (trimmed.length < 1 || trimmed.length > 20) return;
    lane.name = trimmed;
  }
  resetLaneName(laneId) {
    const lane = this.lanesById[laneId];
    if (!lane || !lane.editable) return;
    lane.name = laneId === 'lane1' ? '他1' : '他2';
  }
}

export function nextFutureSundayYMD() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = (7 - day) % 7;
  const offset = daysUntilSunday === 0 ? 7 : daysUntilSunday; // future Sunday
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`; // input[type=date] uses yyyy-mm-dd
}

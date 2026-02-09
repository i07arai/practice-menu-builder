// Roster management logic

let ROSTER = [];

export async function loadRosterConfig() {
  try {
    // 常に相対パスを使用（GitHub Pages対応）
    const basePath = './config/member-config.json';
    const fullUrl = new URL(basePath, window.location.href);
    console.log('🔍 Loading roster from:', basePath);
    console.log('🔍 Full URL:', fullUrl.href);
    console.log('🔍 Current location:', window.location.href);
    const response = await fetch(basePath);
    console.log('📡 Response status:', response.status, response.statusText);
    if (!response.ok) {
      console.error('❌ member-config.json not found (404), using default roster');
      console.error('❌ Attempted URL:', fullUrl.href);
      return;
    }
    const config = await response.json();
    ROSTER = config.players || [];
    console.log('Roster config loaded:', ROSTER.length, 'players');
  } catch (err) {
    console.error('Failed to load roster config:', err);
  }
}

export function getRoster() {
  return ROSTER;
}

export function getPlayerById(id) {
  return ROSTER.find(p => p.id === id);
}

export function getPlayersByRole(role) {
  return ROSTER.filter(p => p.role === role);
}

export function getPlayersByPosition(position) {
  return ROSTER.filter(p => p.position === position);
}

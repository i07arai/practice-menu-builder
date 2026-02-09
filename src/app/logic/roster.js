// Roster management logic

let ROSTER = [];

export async function loadRosterConfig() {
  try {
    // 相対パスを使用（file://プロトコルでも動作）
    const basePath = window.location.pathname.includes('index.html') 
      ? './config/member-config.json' 
      : '/config/member-config.json';
    console.log('Loading roster from:', basePath);
    const response = await fetch(basePath);
    if (!response.ok) {
      console.warn('member-config.json not found, using default roster');
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

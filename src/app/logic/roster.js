// Roster management logic

let ROSTER = [];

export async function loadRosterConfig() {
  try {
    const basePath = './config/member-config.json';
    const response = await fetch(basePath);
    if (!response.ok) {
      console.warn('member-config.json not found');
      return;
    }
    const config = await response.json();
    ROSTER = config.players || [];
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

import type { ApiGame, ApiTeam } from '../types';

const API_BASE = 'https://worldcup26.ir';

export async function fetchAllGames(): Promise<ApiGame[]> {
  const res = await fetch(`${API_BASE}/get/games`);
  if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
  const data = await res.json();
  return data.games;
}

export async function fetchAllTeams(): Promise<ApiTeam[]> {
  const res = await fetch(`${API_BASE}/get/teams`);
  if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`);
  const data = await res.json();
  return data.teams;
}

export async function fetchGroup(name: string) {
  const res = await fetch(`${API_BASE}/get/group?name=${name}`);
  if (!res.ok) throw new Error(`Failed to fetch group ${name}: ${res.status}`);
  return res.json();
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

export function mapStageFromType(type: string): 'group' | 'knockout' {
  switch (type) {
    case 'group':
      return 'group';
    case 'r32':
    case 'r16':
    case 'qf':
    case 'sf':
    case 'third':
    case 'final':
      return 'knockout';
    default:
      return 'group';
  }
}

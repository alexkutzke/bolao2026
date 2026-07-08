export type PointsResult = {
  points: number;
  detail: 'exact' | 'winner_diff' | 'winner' | 'one_team_goals' | null;
};

/**
 * Calcula pontos de um palpite baseado no resultado real.
 * Grupos: 10/7/4/2 fixo.
 * Mata-mata: 8/6/4/2 base, com multiplicador por rodada:
 *   R32(matchday 4)=×1, R16(5)=×1.5, QF(6)=×2, SF(7)=×2.5, 3º(8)=×2.5, Final(9)=×3
 * Apenas a maior pontuação é retornada (não acumula).
 */
export function calculatePoints(
  predictionHome: number,
  predictionAway: number,
  actualHome: number,
  actualAway: number,
  stage: 'group' | 'knockout' = 'knockout',
  matchday: number = 1,
): PointsResult {
  const predWinner = Math.sign(predictionHome - predictionAway);
  const actualWinner = Math.sign(actualHome - actualAway);

  const baseExact = stage === 'group' ? 10 : 8;
  const baseDiff = stage === 'group' ? 7 : 6;
  const mult = getMultiplier(stage, matchday);

  // Placar exato
  if (predictionHome === actualHome && predictionAway === actualAway) {
    return { points: Math.round(baseExact * mult), detail: 'exact' };
  }

  // Vencedor + saldo de gols
  if (predWinner === actualWinner && predWinner !== 0) {
    const predDiff = predictionHome - predictionAway;
    const actualDiff = actualHome - actualAway;
    if (predDiff === actualDiff) {
      return { points: Math.round(baseDiff * mult), detail: 'winner_diff' };
    }
  }

  // Vencedor correto (ou empate)
  if (predWinner === actualWinner) {
    return { points: Math.round(4 * mult), detail: 'winner' };
  }

  // Gols de um time
  if (predictionHome === actualHome || predictionAway === actualAway) {
    return { points: Math.round(2 * mult), detail: 'one_team_goals' };
  }

  return { points: 0, detail: null };
}

function getMultiplier(stage: string, matchday: number): number {
  if (stage === 'group') return 1;
  switch (matchday) {
    case 4: return 1;    // R32
    case 5: return 1.5;  // R16
    case 6: return 2;    // QF
    case 7: return 2.5;  // SF
    case 8: return 2.5;  // 3rd place
    case 9: return 3;    // Final
    default: return 1;
  }
}

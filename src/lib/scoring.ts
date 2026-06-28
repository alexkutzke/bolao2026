export type PointsResult = {
  points: number;
  detail: 'exact' | 'winner_diff' | 'winner' | 'one_team_goals' | null;
};

/**
 * Calcula pontos de um palpite baseado no resultado real.
 * Pontuação difere por fase: grupos 10/7/4/2, mata-mata 8/6/4/2.
 * Apenas a maior pontuação é retornada (não acumula).
 */
export function calculatePoints(
  predictionHome: number,
  predictionAway: number,
  actualHome: number,
  actualAway: number,
  stage: 'group' | 'knockout' = 'knockout',
): PointsResult {
  const predWinner = Math.sign(predictionHome - predictionAway);
  const actualWinner = Math.sign(actualHome - actualAway);

  const ptsExact = stage === 'group' ? 10 : 8;
  const ptsDiff = stage === 'group' ? 7 : 6;

  // Placar exato
  if (predictionHome === actualHome && predictionAway === actualAway) {
    return { points: ptsExact, detail: 'exact' };
  }

  // Vencedor + saldo de gols
  if (predWinner === actualWinner && predWinner !== 0) {
    const predDiff = predictionHome - predictionAway;
    const actualDiff = actualHome - actualAway;
    if (predDiff === actualDiff) {
      return { points: ptsDiff, detail: 'winner_diff' };
    }
  }

  // Vencedor correto (ou empate)
  if (predWinner === actualWinner) {
    return { points: 4, detail: 'winner' };
  }

  // Gols de um time
  if (predictionHome === actualHome || predictionAway === actualAway) {
    return { points: 2, detail: 'one_team_goals' };
  }

  return { points: 0, detail: null };
}

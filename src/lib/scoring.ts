export type PointsResult = {
  points: number;
  detail: 'exact' | 'winner_diff' | 'winner' | 'one_team_goals' | null;
};

/**
 * Calcula pontos de um palpite baseado no resultado real.
 * Apenas a maior pontuação é retornada (não acumula).
 */
export function calculatePoints(
  predictionHome: number,
  predictionAway: number,
  actualHome: number,
  actualAway: number,
): PointsResult {
  const predWinner = Math.sign(predictionHome - predictionAway); // 1, -1, 0
  const actualWinner = Math.sign(actualHome - actualAway);

  // 10 pts: Placar exato
  if (predictionHome === actualHome && predictionAway === actualAway) {
    return { points: 10, detail: 'exact' };
  }

  // 7 pts: Vencedor + saldo de gols (mesmo vencedor E mesma diferença)
  if (predWinner === actualWinner && predWinner !== 0) {
    const predDiff = predictionHome - predictionAway;
    const actualDiff = actualHome - actualAway;
    if (predDiff === actualDiff) {
      return { points: 7, detail: 'winner_diff' };
    }
  }

  // 4 pts: Vencedor correto (ou acerto de empate)
  if (predWinner === actualWinner) {
    return { points: 4, detail: 'winner' };
  }

  // 2 pts: Acertou o número de gols de um dos times
  if (predictionHome === actualHome || predictionAway === actualAway) {
    return { points: 2, detail: 'one_team_goals' };
  }

  return { points: 0, detail: null };
}

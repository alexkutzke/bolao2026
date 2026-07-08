export interface Odds {
  total: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  mostCommonScore: string | null;
  avgHomeGoals: number;
  avgAwayGoals: number;
}

export function computeOdds(
  predictions: Array<{ home_score: number; away_score: number }>,
): Odds | null {
  if (!predictions || predictions.length === 0) return null;

  const total = predictions.length;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let sumHome = 0;
  let sumAway = 0;

  // Count score occurrences for mode
  const scoreCounts = new Map<string, number>();

  for (const p of predictions) {
    sumHome += p.home_score;
    sumAway += p.away_score;

    if (p.home_score > p.away_score) homeWins++;
    else if (p.home_score === p.away_score) draws++;
    else awayWins++;

    const key = `${p.home_score}×${p.away_score}`;
    scoreCounts.set(key, (scoreCounts.get(key) || 0) + 1);
  }

  // Find most common score
  let mostCommonScore: string | null = null;
  let maxCount = 0;
  for (const [score, count] of scoreCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonScore = score;
    }
  }

  return {
    total,
    homeWinPct: Math.round((homeWins / total) * 100),
    drawPct: Math.round((draws / total) * 100),
    awayWinPct: Math.round((awayWins / total) * 100),
    mostCommonScore,
    avgHomeGoals: Math.round((sumHome / total) * 10) / 10,
    avgAwayGoals: Math.round((sumAway / total) * 10) / 10,
  };
}

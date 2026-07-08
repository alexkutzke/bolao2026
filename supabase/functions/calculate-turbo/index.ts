import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Prediction {
  id: number;
  user_id: string;
  bolao_id: string;
  home_score: number;
  away_score: number;
}

interface Match {
  id: number;
  home_score: number;
  away_score: number;
  stage: string;
  matchday: number;
}

function getRoundMultiplier(matchday: number): number {
  switch (matchday) {
    case 4: return 1;
    case 5: return 1.5;
    case 6: return 2;
    case 7: return 2.5;
    case 8: return 2.5;
    case 9: return 3;
    default: return 1;
  }
}

function getBasePoints(predHome: number, predAway: number, actualHome: number, actualAway: number, stage: string) {
  const predWinner = Math.sign(predHome - predAway);
  const actualWinner = Math.sign(actualHome - actualAway);
  const exact = stage === 'group' ? 10 : 8;
  const diff = stage === 'group' ? 7 : 6;

  if (predHome === actualHome && predAway === actualAway) return { points: exact, detail: 'exact' };
  if (predWinner === actualWinner && predWinner !== 0 && (predHome - predAway) === (actualHome - actualAway)) return { points: diff, detail: 'winner_diff' };
  if (predWinner === actualWinner) return { points: 4, detail: 'winner' };
  if (predHome === actualHome || predAway === actualAway) return { points: 2, detail: 'one_team_goals' };
  return { points: 0, detail: null };
}

function getTurboMultiplier(position: number): number {
  if (position === 1) return 1.0;
  if (position <= 3) return 1.2;
  if (position <= 6) return 1.5;
  return 2.0;
}

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    // Get all finished knockout matches, ordered by date
    const { data: matches } = await supabase
      .from('matches')
      .select('id, home_score, away_score, stage, matchday')
      .eq('stage', 'knockout')
      .eq('finished', true)
      .not('home_score', 'is', null)
      .order('match_date', { ascending: true });

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No finished knockout matches' }), { headers });
    }

    // Get all bolões
    const { data: boloes } = await supabase.from('boloes').select('id, name');
    if (!boloes || boloes.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No boloes' }), { headers });
    }

    // Clear previous turbo scores (full recalc every time)
    await supabase.from('turbo_scores').delete().neq('id', 0);

    let totalScored = 0;

    // For each bolão, process matches chronologically
    for (const bolao of boloes) {
      // Track running totals per user (position in turbo ranking)
      const runningTotals = new Map<string, number>();

      for (const match of matches as Match[]) {
        const { data: preds } = await supabase
          .from('predictions')
          .select('id, user_id, bolao_id, home_score, away_score')
          .eq('match_id', match.id)
          .eq('bolao_id', bolao.id);

        if (!preds || preds.length === 0) continue;

        // Calculate current positions
        const sorted = [...runningTotals.entries()].sort((a, b) => b[1] - a[1]);
        const positions = new Map<string, number>();
        sorted.forEach(([userId], idx) => positions.set(userId, idx + 1));

        // Score each prediction
        for (const pred of preds as Prediction[]) {
          const baseResult = getBasePoints(pred.home_score, pred.away_score, match.home_score!, match.away_score!, match.stage);
          const roundMult = getRoundMultiplier(match.matchday);
          const baseTotal = Math.round(baseResult.points * roundMult);

          const position = positions.get(pred.user_id) || sorted.length + 1;
          const turboMult = getTurboMultiplier(position);
          const finalPoints = Math.round(baseTotal * turboMult);

          await supabase.from('turbo_scores').insert({
            user_id: pred.user_id,
            bolao_id: bolao.id,
            match_id: match.id,
            base_points: baseTotal,
            turbo_multiplier: turboMult,
            final_points: finalPoints,
            position_at_time: position,
            detail: baseResult.detail,
          });

          // Update running total
          runningTotals.set(pred.user_id, (runningTotals.get(pred.user_id) || 0) + finalPoints);
          totalScored++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, scored: totalScored, matches: matches.length, boloes: boloes.length }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): { points: number; detail: string | null } {
  const predWinner = Math.sign(predHome - predAway);
  const actualWinner = Math.sign(actualHome - actualAway);

  // 10 pts: exact score
  if (predHome === actualHome && predAway === actualAway) {
    return { points: 10, detail: 'exact' };
  }

  // 7 pts: correct winner + correct goal difference
  if (predWinner === actualWinner && predWinner !== 0) {
    if (predHome - predAway === actualHome - actualAway) {
      return { points: 7, detail: 'winner_diff' };
    }
  }

  // 4 pts: correct winner or draw
  if (predWinner === actualWinner) {
    return { points: 4, detail: 'winner' };
  }

  // 2 pts: correct goals for one team
  if (predHome === actualHome || predAway === actualAway) {
    return { points: 2, detail: 'one_team_goals' };
  }

  return { points: 0, detail: null };
}

Deno.serve(async (_req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    // Get all finished matches with scores
    const { data: finishedMatches, error: matchError } = await supabase
      .from('matches')
      .select('id, home_score, away_score')
      .eq('finished', true)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (matchError) throw new Error(matchError.message);
    if (!finishedMatches || finishedMatches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, calculated: 0, message: 'No finished matches with scores' }),
        { headers },
      );
    }

    let calculated = 0;
    for (const match of finishedMatches) {
      const { data: preds, error: predError } = await supabase
        .from('predictions')
        .select('id, home_score, away_score')
        .eq('match_id', match.id)
        .is('points', null);

      if (predError) continue;
      if (!preds) continue;

      for (const pred of preds) {
        const result = calculatePoints(
          pred.home_score,
          pred.away_score,
          match.home_score!,
          match.away_score!,
        );

        const { error } = await supabase
          .from('predictions')
          .update({ points: result.points, points_detail: result.detail })
          .eq('id', pred.id);

        if (!error) calculated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, calculated }),
      { headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

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

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const force = new URL(req.url).searchParams.get('force') === 'true';

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
        .select('id, home_score, away_score, points')
        .eq('match_id', match.id);

      if (predError) continue;

      const toScore = force ? preds : (preds?.filter((p) => p.points === null) || []);

      for (const pred of toScore) {
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

    // Save rankings snapshot for position change tracking
    for (const stage of ['group', 'knockout']) {
      const { data: leaderboard, error: lbError } = await supabase
        .from('predictions')
        .select('user_id, points, matches!inner(stage)')
        .eq('matches.stage', stage)
        .not('points', 'is', null);

      if (lbError) {
        console.error(`Snapshot query error for ${stage}:`, lbError);
        continue;
      }

      if (leaderboard && leaderboard.length > 0) {
        // Aggregate points per user
        const totals = new Map<string, number>();
        for (const row of leaderboard) {
          totals.set(row.user_id, (totals.get(row.user_id) || 0) + row.points);
        }
        // Sort by points desc and assign positions
        const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
        for (let i = 0; i < sorted.length; i++) {
          const [userId, pts] = sorted[i];
          await supabase
            .from('rankings_snapshot')
            .upsert({
              stage,
              user_id: userId,
              position: i + 1,
              total_points: pts,
              updated_at: new Date().toISOString(),
            });
        }
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

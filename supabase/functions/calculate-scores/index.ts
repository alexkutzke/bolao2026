import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getMultiplier(stage: string, matchday: number): number {
  if (stage === 'group') return 1;
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

function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  stage: string,
  matchday: number,
): { points: number; detail: string | null } {
  const predWinner = Math.sign(predHome - predAway);
  const actualWinner = Math.sign(actualHome - actualAway);

  const baseExact = stage === 'group' ? 10 : 8;
  const baseDiff = stage === 'group' ? 7 : 6;
  const mult = getMultiplier(stage, matchday);

  if (predHome === actualHome && predAway === actualAway) {
    return { points: Math.round(baseExact * mult), detail: 'exact' };
  }
  if (predWinner === actualWinner && predWinner !== 0) {
    if (predHome - predAway === actualHome - actualAway) {
      return { points: Math.round(baseDiff * mult), detail: 'winner_diff' };
    }
  }
  if (predWinner === actualWinner) {
    return { points: Math.round(4 * mult), detail: 'winner' };
  }
  if (predHome === actualHome || predAway === actualAway) {
    return { points: Math.round(2 * mult), detail: 'one_team_goals' };
  }
  return { points: 0, detail: null };
}

async function saveRankingsSnapshot(bolaoId: string) {
  for (const stage of ['group', 'knockout']) {
    const { data: leaderboard, error } = await supabase
      .from('predictions')
      .select('user_id, points, matches!inner(stage)')
      .eq('bolao_id', bolaoId)
      .eq('matches.stage', stage)
      .not('points', 'is', null);

    if (error || !leaderboard || leaderboard.length === 0) continue;

    const totals = new Map<string, number>();
    for (const row of leaderboard) {
      totals.set(row.user_id, (totals.get(row.user_id) || 0) + row.points);
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < sorted.length; i++) {
      const [userId, pts] = sorted[i];
      await supabase.from('rankings_snapshot').upsert({
        bolao_id: bolaoId,
        stage,
        user_id: userId,
        position: i + 1,
        total_points: pts,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const force = new URL(req.url).searchParams.get('force') === 'true';

  try {
    // Get all bolões
    const { data: boloes, error: boloesError } = await supabase
      .from('boloes')
      .select('id, name');

    if (boloesError) throw new Error(boloesError.message);
    if (!boloes || boloes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, calculated: 0, message: 'No boloes found' }),
        { headers },
      );
    }

    // Save snapshots BEFORE calculating
    for (const bolao of boloes) {
      await saveRankingsSnapshot(bolao.id);
    }

    // Calculate scores for all boloes
    const { data: finishedMatches, error: matchError } = await supabase
      .from('matches')
      .select('id, home_score, away_score, stage, matchday')
      .eq('finished', true)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (matchError) throw new Error(matchError.message);
    if (!finishedMatches || finishedMatches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, calculated: 0, message: 'No finished matches' }),
        { headers },
      );
    }

    let calculated = 0;
    for (const match of finishedMatches) {
      const { data: preds, error: predError } = await supabase
        .from('predictions')
        .select('id, bolao_id, home_score, away_score, points')
        .eq('match_id', match.id);

      if (predError) continue;

      const toScore = force ? preds : (preds?.filter((p) => p.points === null) || []);

      for (const pred of toScore) {
        const result = calculatePoints(
          pred.home_score,
          pred.away_score,
          match.home_score!,
          match.away_score!,
          match.stage,
          match.matchday,
        );

        const { error } = await supabase
          .from('predictions')
          .update({ points: result.points, points_detail: result.detail })
          .eq('id', pred.id);

        if (!error) calculated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, calculated, boloes: boloes.length }),
      { headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

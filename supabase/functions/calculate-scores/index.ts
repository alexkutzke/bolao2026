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

    // Batch upsert
    const rows = sorted.map(([userId, pts], i) => ({
      bolao_id: bolaoId,
      stage,
      user_id: userId,
      position: i + 1,
      total_points: pts,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('rankings_snapshot')
        .upsert(rows);
      if (error) console.error(`Snapshot error for ${bolaoId}/${stage}:`, error);
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
      .select('id, home_score, away_score, stage, matchday, group_name, home_team_id, away_team_id')
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
        .select('id, home_score, away_score, points')
        .eq('match_id', match.id);

      if (predError || !preds) continue;

      const toScore = force ? preds : preds.filter((p) => p.points === null);
      if (toScore.length === 0) continue;

      // Calculate scores and batch update via RPC (single DB call per match)
      const ids = toScore.map((p) => p.id);
      const { error } = await supabase.rpc('calculate_match_scores', {
        match_id: match.id,
        match_stage: match.stage,
        match_matchday: match.matchday,
        force_recalc: force,
      });

      if (!error) calculated += toScore.length;
      else console.error(`Score error for match ${match.id}:`, error);
    }

    // Score master predictions if the final is finished
    const finalMatch = finishedMatches?.find((m) => m.group_name === 'FINAL');
    if (finalMatch && finalMatch.home_score !== null) {
      let masterScored = 0;
      const { data: masters } = await supabase
        .from('master_predictions')
        .select('*');

      if (masters && masters.length > 0) {
        const toScore = force ? masters : masters.filter((m) => m.points === null);
        for (const mp of toScore) {
          let pts = 0;
          const homeOk = mp.home_team_id === finalMatch.home_team_id || mp.home_team_id === finalMatch.away_team_id;
          const awayOk = mp.away_team_id === finalMatch.home_team_id || mp.away_team_id === finalMatch.away_team_id;
          if (homeOk && awayOk) pts += 25;
          if (mp.home_score === finalMatch.home_score && mp.away_score === finalMatch.away_score) pts += 30;
          await supabase.from('master_predictions').update({ points: pts }).eq('id', mp.id);
          masterScored++;
        }
      }
      console.log(`Master predictions scored: ${masterScored}`);
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

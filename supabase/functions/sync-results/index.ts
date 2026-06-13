import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ApiGame {
  id: string;
  home_score: string;
  away_score: string;
  finished: string;
}

Deno.serve(async (_req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const res = await fetch('https://worldcup26.ir/get/games');
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `API returned ${res.status}` }), {
        status: 502,
        headers,
      });
    }

    const { games } = await res.json() as { games: ApiGame[] };

    // Filter: only finished games with scores
    const finished = games.filter(
      (g) => g.finished === 'TRUE' && g.home_score && g.home_score !== 'null',
    );

    let updated = 0;
    for (const game of finished) {
      const homeScore = parseInt(game.home_score);
      const awayScore = parseInt(game.away_score);

      // Only update matches that aren't manually set and don't already have a score
      const { data: existing } = await supabase
        .from('matches')
        .select('id, manually_set, home_score')
        .eq('api_id', parseInt(game.id))
        .maybeSingle();

      if (existing && !existing.manually_set) {
        const { error } = await supabase
          .from('matches')
          .update({
            home_score: homeScore,
            away_score: awayScore,
            finished: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!error) updated++;
        else console.error(`Update error for game ${game.id}:`, error);
      }
    }

    console.log(`Results sync: ${updated} updated`);

    return new Response(
      JSON.stringify({ success: true, updated, total_finished: finished.length }),
      { headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

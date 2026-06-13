import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_BASE = 'https://worldcup26.ir';

// Stadium ID → UTC offset for date conversion (June 2026, DST applied)
// Eastern: EDT/GMT-4, Central: CDT/GMT-5, Mountain: MDT/GMT-6, Western: PDT/GMT-7
// Mexico: CST/GMT-6 (no DST since 2022)
const STADIUM_OFFSETS: Record<string, number> = {
  '1': -6,  // Estadio Azteca, Mexico City — CST
  '2': -6,  // Estadio Akron, Guadalajara — CST
  '3': -6,  // Estadio BBVA, Monterrey — CST
  '4': -5,  // AT&T Stadium, Dallas — CDT
  '5': -5,  // NRG Stadium, Houston — CDT
  '6': -5,  // Arrowhead, Kansas City — CDT
  '7': -4,  // Mercedes-Benz, Atlanta — EDT
  '8': -4,  // Hard Rock, Miami — EDT
  '9': -4,  // Gillette, Boston — EDT
  '10': -4, // Lincoln Financial, Philadelphia — EDT
  '11': -4, // MetLife, NY/NJ — EDT
  '12': -4, // BMO Field, Toronto — EDT
  '13': -7, // BC Place, Vancouver — PDT
  '14': -7, // Lumen Field, Seattle — PDT
  '15': -7, // Levi's, San Francisco — PDT
  '16': -7, // SoFi, Los Angeles — PDT
};

interface ApiGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  group: string;
  matchday: string;
  date?: string;
  local_date: string;
  stadium_id: string;
  finished: string;
  type: string;
  home_team_name_en: string;
  home_team_name_fa: string;
  away_team_name_en: string;
  away_team_name_fa: string;
  home_team_label: string;
  away_team_label: string;
}

function mapStage(type: string): 'group' | 'knockout' {
  switch (type) {
    case 'group': return 'group';
    case 'r32':
    case 'r16':
    case 'qf':
    case 'sf':
    case 'third':
    case 'final': return 'knockout';
    default: return 'group';
  }
}

/** Parse local_date (MM/DD/YYYY HH:mm) as stadium local time → UTC ISO */
function parseMatchDate(game: ApiGame): string {
  // Prefer ISO date field if present and valid
  if (game.date && game.date !== 'null' && !isNaN(Date.parse(game.date))) {
    return new Date(game.date).toISOString();
  }

  const offset = STADIUM_OFFSETS[game.stadium_id] ?? -5;

  if (game.local_date) {
    const cleaned = game.local_date.trim();
    const [datePart, timePart] = cleaned.split(/\s+/);
    if (datePart && timePart) {
      const [month, day, year] = datePart.split('/').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      if (month && day && year && !isNaN(hour) && !isNaN(minute)) {
        // Create date in stadium local time (UTC+offset) → convert to UTC
        const localMs = Date.UTC(year, month - 1, day, hour, minute);
        const utcMs = localMs - offset * 3600000;
        return new Date(utcMs).toISOString();
      }
    }
  }

  console.error(`Could not parse date for game ${game.id}: date=${game.date}, local_date=${game.local_date}`);
  return new Date(0).toISOString();
}

Deno.serve(async (_req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    // Fetch all games from API
    const res = await fetch(`${API_BASE}/get/games`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `API returned ${res.status}` }), {
        status: 502,
        headers,
      });
    }

    const { games } = await res.json() as { games: ApiGame[] };
    console.log(`Fetched ${games.length} games from API`);
    const now = new Date().toISOString();
    let synced = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const game of games) {
      const matchData = {
        api_id: parseInt(game.id),
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        home_team_name: game.home_team_name_en,
        away_team_name: game.away_team_name_en,
        home_score: game.home_score && game.home_score !== 'null' ? parseInt(game.home_score) : null,
        away_score: game.away_score && game.away_score !== 'null' ? parseInt(game.away_score) : null,
        group_name: game.group,
        matchday: parseInt(game.matchday),
        match_date: parseMatchDate(game),
        stadium: game.stadium_id,
        stage: mapStage(game.type),
        finished: game.finished === 'TRUE',
        home_team_label: game.home_team_label || null,
        away_team_label: game.away_team_label || null,
        updated_at: now,
      };

      // Check if match exists — maybeSingle avoids error on empty table
      const { data: existing } = await supabase
        .from('matches')
        .select('manually_set, id')
        .eq('api_id', matchData.api_id)
        .maybeSingle();

      if (existing) {
        if (!existing.manually_set) {
          const { error } = await supabase
            .from('matches')
            .update(matchData)
            .eq('api_id', matchData.api_id);
          if (!error) updated++;
          else { console.error(`Update error for game ${game.id}:`, error); errors++; }
        } else {
          skipped++;
        }
      } else {
        const { error } = await supabase
          .from('matches')
          .insert({ ...matchData, manually_set: false });
        if (!error) synced++;
        else { console.error(`Insert error for game ${game.id}:`, error); errors++; }
      }
    }

    console.log(`Sync done: ${synced} inserted, ${updated} updated, ${skipped} skipped (manual), ${errors} errors`);

    // Sync teams (flags)
    let teamsSynced = 0;
    try {
      const teamsRes = await fetch(`${API_BASE}/get/teams`);
      if (teamsRes.ok) {
        const { teams } = await teamsRes.json() as { teams: Array<{ id: string; name_en: string; flag: string; iso2: string }> };
        for (const team of teams) {
          const { error } = await supabase
            .from('teams')
            .upsert({ id: team.id, name_en: team.name_en, flag_url: team.flag, iso2: team.iso2 });
          if (!error) teamsSynced++;
        }
        console.log(`Teams synced: ${teamsSynced}`);
      }
    } catch (e) {
      console.error('Team sync error:', e);
    }

    // Sync stadiums
    let stadiumsSynced = 0;
    try {
      const stadiumsRes = await fetch(`${API_BASE}/get/stadiums`);
      if (stadiumsRes.ok) {
        const { stadiums } = await stadiumsRes.json() as { stadiums: Array<{ id: string; name_en: string; city_en: string }> };
        for (const s of stadiums) {
          const { error } = await supabase
            .from('stadiums')
            .upsert({ id: s.id, name_en: s.name_en, city_en: s.city_en });
          if (!error) stadiumsSynced++;
        }
        console.log(`Stadiums synced: ${stadiumsSynced}`);
      }
    } catch (e) {
      console.error('Stadium sync error:', e);
    }

    return new Response(
      JSON.stringify({ success: true, synced, updated, skipped, errors, teams: teamsSynced, total: games.length }),
      { headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

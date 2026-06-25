import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TeamMatch {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  match_date: string;
}

export interface TeamForm {
  last5: ('W' | 'D' | 'L')[];
  goalsFor: number;
  goalsAgainst: number;
}

export function useTeamHistory() {
  const [historyMap, setHistoryMap] = useState<Map<string, TeamForm>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('matches')
      .select('home_team_id, away_team_id, home_score, away_score, match_date')
      .eq('finished', true)
      .not('home_score', 'is', null)
      .order('match_date', { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        // Group by team
        const teamMatches = new Map<string, TeamMatch[]>();
        for (const m of data) {
          // Home team
          if (m.home_team_id && m.home_team_id !== '0') {
            const list = teamMatches.get(m.home_team_id) || [];
            list.push(m);
            teamMatches.set(m.home_team_id, list);
          }
          // Away team
          if (m.away_team_id && m.away_team_id !== '0') {
            const list = teamMatches.get(m.away_team_id) || [];
            list.push(m);
            teamMatches.set(m.away_team_id, list);
          }
        }

        // Compute form for each team
        const map = new Map<string, TeamForm>();
        for (const [teamId, matches] of teamMatches) {
          // Sort by date descending, take last 5
          const sorted = matches.sort(
            (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime(),
          );
          const last5 = sorted.slice(0, 5);
          const form: ('W' | 'D' | 'L')[] = [];
          let goalsFor = 0;
          let goalsAgainst = 0;

          for (const m of last5) {
            const isHome = m.home_team_id === teamId;
            const scored = isHome ? m.home_score : m.away_score;
            const conceded = isHome ? m.away_score : m.home_score;
            goalsFor += scored;
            goalsAgainst += conceded;

            if (scored > conceded) form.push('W');
            else if (scored === conceded) form.push('D');
            else form.push('L');
          }

          map.set(teamId, { last5: form, goalsFor, goalsAgainst });
        }

        setHistoryMap(map);
        setLoading(false);
      });
  }, []);

  return { historyMap, loading };
}

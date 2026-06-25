import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface GlobalOdds {
  match_id: number;
  total: number;
  home_win_pct: number;
  draw_pct: number;
  away_win_pct: number;
  most_common_score: string | null;
  avg_home_goals: number;
  avg_away_goals: number;
}

export function useGlobalOdds(matchIds: number[]) {
  const [oddsMap, setOddsMap] = useState<Map<number, GlobalOdds>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchOdds = useCallback(async () => {
    if (matchIds.length === 0) {
      setOddsMap(new Map());
      setLoading(false);
      return;
    }

    const { data } = await supabase.rpc('get_all_matches_odds', { match_ids: matchIds });
    if (data) {
      const map = new Map<number, GlobalOdds>();
      for (const row of data) {
        map.set(row.match_id, {
          match_id: row.match_id,
          total: Number(row.total),
          home_win_pct: Number(row.home_win_pct),
          draw_pct: Number(row.draw_pct),
          away_win_pct: Number(row.away_win_pct),
          most_common_score: row.most_common_score,
          avg_home_goals: Number(row.avg_home_goals),
          avg_away_goals: Number(row.avg_away_goals),
        });
      }
      setOddsMap(map);
    }
    setLoading(false);
  }, [JSON.stringify(matchIds)]); // eslint-disable-line

  useEffect(() => {
    fetchOdds();
  }, [fetchOdds]);

  return { oddsMap, loading };
}

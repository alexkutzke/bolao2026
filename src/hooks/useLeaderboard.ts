import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry, CompetitionSlug } from '../types';

export function useLeaderboard(stage: CompetitionSlug) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('predictions')
      .select(`
        points,
        points_detail,
        user_id,
        match_id,
        profiles!inner(name),
        matches!inner(stage)
      `)
      .eq('matches.stage', stage)
      .not('points', 'is', null);

    if (data) {
      const map = new Map<string, LeaderboardEntry>();
      for (const row of data) {
        const entry = map.get(row.user_id) || {
          user_id: row.user_id,
          name: (row.profiles as unknown as { name: string }).name,
          total_points: 0,
          exact_scores: 0,
          winner_diff: 0,
          winners: 0,
          one_team_goals: 0,
        };
        entry.total_points += row.points;
        if (row.points_detail === 'exact') entry.exact_scores++;
        else if (row.points_detail === 'winner_diff') entry.winner_diff++;
        else if (row.points_detail === 'winner') entry.winners++;
        else if (row.points_detail === 'one_team_goals') entry.one_team_goals++;
        map.set(row.user_id, entry);
      }
      setEntries([...map.values()].sort((a, b) => b.total_points - a.total_points));
    }
    setLoading(false);
  }, [stage]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, refetch: fetchLeaderboard };
}

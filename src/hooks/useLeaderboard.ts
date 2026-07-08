import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  total_points: number;
  exact_scores: number;
  winner_diff: number;
  winners: number;
  one_team_goals: number;
  change: 'up' | 'down' | 'same' | null;
  created_at: string;
}

export function useLeaderboard(stage: string, bolaoId: string | undefined) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!bolaoId) { setLoading(false); return; }
    setLoading(true);

    const [currentRes, snapshotRes] = await Promise.all([
      supabase
        .from('predictions')
        .select(`points, points_detail, user_id, match_id, profiles!inner(name, created_at), matches!inner(stage)`)
        .eq('bolao_id', bolaoId)
        .eq('matches.stage', stage)
        .not('points', 'is', null),
      supabase
        .from('rankings_snapshot')
        .select('user_id, position')
        .eq('bolao_id', bolaoId)
        .eq('stage', stage),
    ]);

    const map = new Map<string, LeaderboardEntry>();
    if (currentRes.data) {
      for (const row of currentRes.data) {
        const entry = map.get(row.user_id) || {
          user_id: row.user_id,
          name: (row.profiles as unknown as { name: string; created_at: string }).name,
          total_points: 0,
          exact_scores: 0,
          winner_diff: 0,
          winners: 0,
          one_team_goals: 0,
          change: 'same' as const,
          created_at: (row.profiles as unknown as { name: string; created_at: string }).created_at,
        };
        entry.total_points += row.points;
        if (row.points_detail === 'exact') entry.exact_scores++;
        else if (row.points_detail === 'winner_diff') entry.winner_diff++;
        else if (row.points_detail === 'winner') entry.winners++;
        else if (row.points_detail === 'one_team_goals') entry.one_team_goals++;
        map.set(row.user_id, entry);
      }
    }

    const sorted = [...map.values()].sort((a, b) => {
      // 1. Total points
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      // 2. Exact scores
      if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores;
      // 3. Winner + diff
      if (b.winner_diff !== a.winner_diff) return b.winner_diff - a.winner_diff;
      // 4. Winner
      if (b.winners !== a.winners) return b.winners - a.winners;
      // 5. One team goals
      if (b.one_team_goals !== a.one_team_goals) return b.one_team_goals - a.one_team_goals;
      // 6. Registration date (older wins)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    if (snapshotRes.data && snapshotRes.data.length > 0) {
      const prevPos = new Map(snapshotRes.data.map((s) => [s.user_id, s.position]));
      sorted.forEach((entry, idx) => {
        const prev = prevPos.get(entry.user_id);
        const curr = idx + 1;
        if (prev !== undefined) {
          if (curr < prev) entry.change = 'up';
          else if (curr > prev) entry.change = 'down';
          else entry.change = 'same';
        } else {
          entry.change = null;
        }
      });
    }

    setEntries(sorted);
    setLoading(false);
  }, [stage, bolaoId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, refetch: fetchLeaderboard };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CompetitionSlug } from '../types';

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  total_points: number;
  exact_scores: number;
  winner_diff: number;
  winners: number;
  one_team_goals: number;
  change: 'up' | 'down' | 'same' | null;
}

export function useLeaderboard(stage: CompetitionSlug) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);

    const [currentRes, snapshotRes] = await Promise.all([
      supabase
        .from('predictions')
        .select(`points, points_detail, user_id, match_id, profiles!inner(name), matches!inner(stage)`)
        .eq('matches.stage', stage)
        .not('points', 'is', null),
      supabase
        .from('rankings_snapshot')
        .select('user_id, position')
        .eq('stage', stage),
    ]);

    // Build current ranking
    const map = new Map<string, LeaderboardEntry>();
    if (currentRes.data) {
      for (const row of currentRes.data) {
        const entry = map.get(row.user_id) || {
          user_id: row.user_id,
          name: (row.profiles as unknown as { name: string }).name,
          total_points: 0,
          exact_scores: 0,
          winner_diff: 0,
          winners: 0,
          one_team_goals: 0,
          change: 'same' as const,
        };
        entry.total_points += row.points;
        if (row.points_detail === 'exact') entry.exact_scores++;
        else if (row.points_detail === 'winner_diff') entry.winner_diff++;
        else if (row.points_detail === 'winner') entry.winners++;
        else if (row.points_detail === 'one_team_goals') entry.one_team_goals++;
        map.set(row.user_id, entry);
      }
    }

    const sorted = [...map.values()].sort((a, b) => b.total_points - a.total_points);

    // Compare with snapshot to determine position changes
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
          entry.change = null; // new player
        }
      });
    }

    setEntries(sorted);
    setLoading(false);
  }, [stage]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, refetch: fetchLeaderboard };
}

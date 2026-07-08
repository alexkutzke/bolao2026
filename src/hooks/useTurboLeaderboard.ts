import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TurboLeaderboardEntry } from '../types';

export function useTurboLeaderboard(bolaoId: string | undefined) {
  const [entries, setEntries] = useState<TurboLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!bolaoId) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('turbo_scores')
      .select('user_id, final_points, profiles!inner(name)')
      .eq('bolao_id', bolaoId);

    if (data) {
      const map = new Map<string, { name: string; total: number }>();
      for (const row of data) {
        const entry = map.get(row.user_id) || {
          name: (row.profiles as unknown as { name: string }).name,
          total: 0,
        };
        entry.total += row.final_points;
        map.set(row.user_id, entry);
      }
      const sorted = [...map.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([userId, val], idx) => ({
          user_id: userId,
          name: val.name,
          total_points: val.total,
          turbo_multiplier: idx === 0 ? 1.0 : idx <= 2 ? 1.2 : idx <= 5 ? 1.5 : 2.0,
        }));
      setEntries(sorted);
    }
    setLoading(false);
  }, [bolaoId]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  return { entries, loading, refetch: fetchLeaderboard };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ChartPoint {
  label: string;
  date: string;
  [userId: string]: number | string;
}

export function usePointsOverTime(stage: string, bolaoId: string | undefined) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!bolaoId) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('predictions')
      .select('user_id, points, matches!inner(match_date, matchday, group_name), profiles!inner(name)')
      .eq('bolao_id', bolaoId)
      .eq('matches.stage', stage)
      .not('points', 'is', null)
      .order('match_date', { referencedTable: 'matches', ascending: true });

    if (!data || data.length === 0) { setLoading(false); return; }

    // Collect user names and running totals
    const names = new Map<string, string>();
    const runningTotals = new Map<string, number>();
    const points: ChartPoint[] = [];

    // Group by match_date + matchday
    const grouped = new Map<string, typeof data>();
    for (const row of data) {
      const match = row.matches as unknown as { match_date: string; matchday: number; group_name: string };
      const key = match.match_date;
      const group = grouped.get(key) || [];
      group.push(row);
      grouped.set(key, group);
      names.set(row.user_id, (row.profiles as unknown as { name: string }).name);
    }

    for (const [date, rows] of grouped) {
      const match = (rows[0].matches as unknown as { match_date: string; matchday: number; group_name: string });
      const label = match.group_name;
      const entry: ChartPoint = { label, date };

      // Add points for this match to running totals
      for (const row of rows) {
        runningTotals.set(row.user_id, (runningTotals.get(row.user_id) || 0) + row.points);
      }

      // Record all running totals at this point
      for (const [userId, total] of runningTotals) {
        entry[userId] = total;
      }

      points.push(entry);
    }

    setUserNames(names);
    setChartData(points);
    setLoading(false);
  }, [stage, bolaoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { chartData, userNames, loading };
}

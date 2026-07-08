import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AuthContext';
import type { MasterPrediction } from '../types';

export function useMasterPrediction() {
  const { user, activeBolao } = useApp();
  const [prediction, setPrediction] = useState<MasterPrediction | null>(null);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchPrediction = useCallback(async () => {
    if (!user || !activeBolao) return;
    setLoading(true);

    const [predRes, countRes] = await Promise.all([
      supabase
        .from('master_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('bolao_id', activeBolao.id)
        .maybeSingle(),
      supabase.rpc('master_count', { bolao_id: activeBolao.id }),
    ]);

    setPrediction(predRes.data || null);
    setCount(countRes.data || 0);
    setLoading(false);
  }, [user, activeBolao]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  async function savePrediction(data: {
    home_team_id: string;
    away_team_id: string;
    home_score: number;
    away_score: number;
  }) {
    if (!user || !activeBolao) return { error: 'Not authenticated' };
    const { error } = await supabase.from('master_predictions').upsert({
      user_id: user.id,
      bolao_id: activeBolao.id,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,bolao_id' });
    if (!error) fetchPrediction();
    return { error };
  }

  return { prediction, count, loading, savePrediction, refetch: fetchPrediction };
}

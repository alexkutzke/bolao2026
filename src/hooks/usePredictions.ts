import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AuthContext';
import type { Prediction } from '../types';

export function usePredictions(matchId?: number) {
  const { user, activeBolao } = useApp();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    if (!user || !activeBolao) return;
    setLoading(true);
    let query = supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('bolao_id', activeBolao.id);
    if (matchId) query = query.eq('match_id', matchId);
    const { data } = await query;
    setPredictions(data || []);
    setLoading(false);
  }, [user, activeBolao, matchId]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  async function savePrediction(matchId: number, home_score: number, away_score: number) {
    if (!user || !activeBolao) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          bolao_id: activeBolao.id,
          home_score,
          away_score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_id,bolao_id' },
      )
      .select()
      .maybeSingle();
    if (!error) fetchPredictions();
    return { data, error };
  }

  return { predictions, loading, savePrediction, refetch: fetchPredictions };
}

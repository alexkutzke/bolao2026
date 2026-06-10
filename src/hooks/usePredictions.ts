import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Prediction } from '../types';

export function usePredictions(matchId?: number) {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('predictions').select('*').eq('user_id', user.id);
    if (matchId) query = query.eq('match_id', matchId);
    const { data } = await query;
    setPredictions(data || []);
    setLoading(false);
  }, [user, matchId]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  async function savePrediction(matchId: number, home_score: number, away_score: number) {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          home_score,
          away_score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_id' },
      )
      .select()
      .maybeSingle();
    if (!error) fetchPredictions();
    return { data, error };
  }

  return { predictions, loading, savePrediction, refetch: fetchPredictions };
}

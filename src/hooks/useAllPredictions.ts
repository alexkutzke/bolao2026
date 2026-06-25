import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Prediction } from '../types';

export interface PredictionWithName extends Prediction {
  points: number | null;
  profiles: { name: string } | null;
}

export function useAllPredictions(matchIds: number[], bolaoId: string | undefined) {
  const [predictions, setPredictions] = useState<PredictionWithName[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    if (!bolaoId || matchIds.length === 0) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('predictions')
      .select('*, profiles(name)')
      .eq('bolao_id', bolaoId)
      .in('match_id', matchIds);

    setPredictions(data || []);
    setLoading(false);
  }, [JSON.stringify(matchIds), bolaoId]); // eslint-disable-line

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return { predictions, loading, refetch: fetchPredictions };
}

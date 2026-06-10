import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, CompetitionSlug } from '../types';

export function useMatches(stage?: CompetitionSlug) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('matches').select('*').order('match_date', { ascending: true });
    if (stage) {
      query = query.eq('stage', stage);
    }
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setMatches(data || []);
    setLoading(false);
  }, [stage]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matches, loading, error, refetch: fetchMatches };
}

/** Verifica se TODOS os jogos da fase de grupos estão finalizados */
export function useGroupStageComplete() {
  const [allFinished, setAllFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkComplete = useCallback(async () => {
    const { count } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'group')
      .eq('finished', false);
    setAllFinished(count === 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkComplete();
  }, [checkComplete]);

  return { allFinished, loading, refetch: checkComplete };
}

export function useMatchGroups() {
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('matches')
      .select('group_name')
      .eq('stage', 'group')
      .order('group_name')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.group_name))].sort();
          setGroups(unique);
        }
        setLoading(false);
      });
  }, []);

  return { groups, loading };
}

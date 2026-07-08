import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Team {
  id: string;
  flag_url: string;
}

export function useTeams() {
  const [teamMap, setTeamMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('teams')
      .select('id, flag_url')
      .then(({ data }) => {
        const map = new Map<string, string>();
        if (data) {
          data.forEach((t: Team) => map.set(t.id, t.flag_url));
        }
        setTeamMap(map);
        setLoading(false);
      });
  }, []);

  return { teamMap, loading };
}

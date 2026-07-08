import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Stadium {
  id: string;
  city_en: string;
}

export function useStadiums() {
  const [stadiumMap, setStadiumMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('stadiums')
      .select('id, city_en')
      .then(({ data }) => {
        const map = new Map<string, string>();
        if (data) {
          data.forEach((s: Stadium) => map.set(s.id, s.city_en));
        }
        setStadiumMap(map);
        setLoading(false);
      });
  }, []);

  return { stadiumMap, loading };
}

-- ============================================================
-- Palpite Master — Final
-- ============================================================

CREATE TABLE IF NOT EXISTS public.master_predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bolao_id UUID NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, bolao_id)
);

ALTER TABLE public.master_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own master predictions"
  ON public.master_predictions FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE OR REPLACE FUNCTION master_count(bolao_id uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*) FROM public.master_predictions WHERE bolao_id = $1;
$$;

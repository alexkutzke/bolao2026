-- ============================================================
-- Bolão Turbo — Pontuação paralela com catch-up
-- ============================================================

CREATE TABLE IF NOT EXISTS public.turbo_scores (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bolao_id UUID NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  base_points INTEGER NOT NULL DEFAULT 0,
  turbo_multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  final_points INTEGER NOT NULL DEFAULT 0,
  position_at_time INTEGER NOT NULL,
  detail TEXT CHECK (detail IN ('exact', 'winner_diff', 'winner', 'one_team_goals')),
  UNIQUE(user_id, match_id, bolao_id)
);

ALTER TABLE public.turbo_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view turbo scores in their bolao"
  ON public.turbo_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bolao_members WHERE bolao_id = turbo_scores.bolao_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

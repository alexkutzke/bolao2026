-- ============================================================
-- Bolão Copa 2026 — Migração do Banco de Dados (Supabase)
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

-- 1. Tabela de Perfis (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabela de Jogos
CREATE TABLE IF NOT EXISTS public.matches (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  home_team_id TEXT NOT NULL DEFAULT '0',
  away_team_id TEXT NOT NULL DEFAULT '0',
  home_team_name TEXT NOT NULL DEFAULT '',
  away_team_name TEXT NOT NULL DEFAULT '',
  home_score INTEGER,
  away_score INTEGER,
  group_name TEXT NOT NULL DEFAULT '',
  matchday INTEGER NOT NULL DEFAULT 1,
  match_date TIMESTAMPTZ NOT NULL,
  stadium TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL CHECK (stage IN ('group', 'knockout')) DEFAULT 'group',
  finished BOOLEAN NOT NULL DEFAULT false,
  home_team_label TEXT,
  away_team_label TEXT,
  manually_set BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_stage ON public.matches(stage);
CREATE INDEX IF NOT EXISTS idx_matches_group ON public.matches(group_name);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_finished ON public.matches(finished);

-- 3. Tabela de Palpites
CREATE TABLE IF NOT EXISTS public.predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER,
  points_detail TEXT CHECK (points_detail IN ('exact', 'winner_diff', 'winner', 'one_team_goals')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_user ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_points ON public.predictions(points);

-- 4. Tabela de Competições (Grupos / Mata-mata)
CREATE TABLE IF NOT EXISTS public.competitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('group', 'knockout'))
);

INSERT INTO public.competitions (name, slug) VALUES
  ('Fase de Grupos', 'group'),
  ('Mata-mata', 'knockout')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- Profiles: usuários leem todos, admin gerencia
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Matches: todos leem, admin insere/atualiza manualmente
CREATE POLICY "Matches are viewable by authenticated users"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can update matches"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Predictions: usuário vê/edita seus próprios palpites, admin vê todos
CREATE POLICY "Users can view own predictions"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can insert own predictions"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own predictions"
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own predictions"
  ON public.predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Competitions: todos leem
CREATE POLICY "Competitions are viewable by everyone"
  ON public.competitions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- Edge Function: sync-matches
-- ============================================================
-- Criar via Supabase CLI ou Dashboard:
-- supabase functions new sync-matches
-- (ver arquivo supabase/functions/sync-matches/index.ts)

-- ============================================================
-- Edge Function: calculate-scores
-- ============================================================
-- Criar via Supabase CLI ou Dashboard:
-- supabase functions new calculate-scores
-- (ver arquivo supabase/functions/calculate-scores/index.ts)

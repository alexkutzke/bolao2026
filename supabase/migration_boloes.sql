-- ============================================================
-- Migração: Suporte a Múltiplos Bolões
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de Bolões
CREATE TABLE IF NOT EXISTS public.boloes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de Membros dos Bolões
CREATE TABLE IF NOT EXISTS public.bolao_members (
  bolao_id UUID NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (bolao_id, user_id)
);

ALTER TABLE public.bolao_members ENABLE ROW LEVEL SECURITY;

-- 3. Adicionar coluna bolao_id em predictions (NULLABLE primeiro)
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS bolao_id UUID REFERENCES public.boloes(id);

-- 4. Adicionar coluna bolao_id em rankings_snapshot (NULLABLE)
ALTER TABLE public.rankings_snapshot 
ADD COLUMN IF NOT EXISTS bolao_id UUID REFERENCES public.boloes(id);

-- 5. Criar bolão default "Família" e migrar dados
DO $$
DECLARE
  v_bolao_id UUID;
  v_profile RECORD;
BEGIN
  -- Criar bolão default
  INSERT INTO public.boloes (id, name, created_by)
  VALUES (gen_random_uuid(), 'Família', (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1))
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_bolao_id;

  -- Se o bolão já existia, pega o id
  IF v_bolao_id IS NULL THEN
    SELECT id INTO v_bolao_id FROM public.boloes WHERE name = 'Família' LIMIT 1;
  END IF;

  -- Adicionar todos os usuários como membros
  FOR v_profile IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.bolao_members (bolao_id, user_id)
    VALUES (v_bolao_id, v_profile.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Migrar predictions existentes para o bolão Família
  UPDATE public.predictions SET bolao_id = v_bolao_id WHERE bolao_id IS NULL;

  -- Migrar rankings_snapshot existentes
  UPDATE public.rankings_snapshot SET bolao_id = v_bolao_id WHERE bolao_id IS NULL;
END $$;

-- 6. Tornar bolao_id NOT NULL nas tabelas (após migração)
ALTER TABLE public.predictions ALTER COLUMN bolao_id SET NOT NULL;
ALTER TABLE public.rankings_snapshot ALTER COLUMN bolao_id SET NOT NULL;

-- 7. Dropar constraints antigas e criar novas com bolao_id
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;
ALTER TABLE public.predictions ADD CONSTRAINT predictions_user_match_bolao_key UNIQUE (user_id, match_id, bolao_id);

-- rankings_snapshot: dropar PK antiga e criar nova
ALTER TABLE public.rankings_snapshot DROP CONSTRAINT IF EXISTS rankings_snapshot_pkey;
ALTER TABLE public.rankings_snapshot ADD PRIMARY KEY (stage, user_id, bolao_id);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Bolões: membros veem seus bolões, admin vê todos
CREATE POLICY "Members can view their boloes"
  ON public.boloes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bolao_members WHERE bolao_id = boloes.id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can insert boloes"
  ON public.boloes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Bolão members: membros veem membros do seu bolão
CREATE POLICY "Members can view bolao memberships"
  ON public.bolao_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bolao_members bm WHERE bm.bolao_id = bolao_members.bolao_id AND bm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage bolao members"
  ON public.bolao_members FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete bolao members"
  ON public.bolao_members FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Atualizar RLS de predictions
DO $$ BEGIN
  DROP POLICY "Authenticated users can view all predictions" ON public.predictions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY "Users can view own predictions" ON public.predictions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Members can view predictions in their bolao"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bolao_members WHERE bolao_id = predictions.bolao_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Members can insert predictions in their bolao"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bolao_members WHERE bolao_id = predictions.bolao_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can update own predictions"
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can delete own predictions"
  ON public.predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Rankings snapshot RLS (drop old policy if it exists)
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.rankings_snapshot DROP POLICY IF EXISTS "Rankings snapshot viewable by authenticated users"';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Members can view rankings in their bolao"
  ON public.rankings_snapshot FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bolao_members WHERE bolao_id = rankings_snapshot.bolao_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

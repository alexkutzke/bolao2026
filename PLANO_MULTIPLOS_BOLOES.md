# Plano: Suporte a Múltiplos Bolões

## 🎯 Objetivo

Permitir que o admin crie múltiplos bolões independentes. Cada bolão tem seus próprios membros, palpites e pontuações. Um usuário pode participar de vários bolões e fazer palpites diferentes em cada um.

---

## 🗄️ Alterações no Banco de Dados

| # | Alteração | Complexidade |
|---|-----------|-------------|
| 1 | **Nova tabela `boloes`** — `id UUID PK`, `name TEXT NOT NULL`, `created_by UUID REFERENCES profiles`, `created_at TIMESTAMPTZ` | Baixa |
| 2 | **Nova tabela `bolao_members`** — `bolao_id UUID REFERENCES boloes`, `user_id UUID REFERENCES profiles`, PK composta `(bolao_id, user_id)` | Baixa |
| 3 | **`predictions`** — adicionar `bolao_id UUID REFERENCES boloes`, alterar UNIQUE de `(user_id, match_id)` para `(user_id, match_id, bolao_id)` | Média |
| 4 | **`rankings_snapshot`** — adicionar `bolao_id UUID REFERENCES boloes`, alterar PK para `(stage, user_id, bolao_id)` | Baixa |
| 5 | **Novas políticas RLS** — palpites filtráveis por `bolao_members`, snapshots idem. Usuário só vê bolões em que é membro. | Média |
| 6 | **Migração de dados** — criar bolão "Família" (default), migrar todos os usuários e palpites existentes para este bolão. Passos: criar bolão → adicionar `bolao_id` NULLABLE → popular → tornar NOT NULL → ajustar constraints. | Média |

---

## ⚙️ Edge Functions

| # | Função | Alteração |
|---|--------|-----------|
| 7 | `calculate-scores` | Iterar por bolão, calcular pontos por bolão, salvar snapshot por bolão (`stage, user_id, bolao_id`) |
| 8 | `create-user` | Aceitar `bolao_ids` opcional para adicionar o novo usuário a bolões existentes |
| 9 | **Nova: `manage-boloes`** | CRUD de bolões (admin): criar bolão, listar membros, adicionar/remover usuários do bolão |

---

## 🖥️ Frontend

| # | Arquivo | Alteração |
|---|---------|-----------|
| 10 | `src/types/index.ts` | Novos tipos: `Bolao`, `BolaoMember` |
| 11 | `src/contexts/AuthContext.tsx` | Adicionar `activeBolao`, `userBoloes`, `setActiveBolao`, `fetchUserBoloes()` |
| 12 | **Novo: `src/components/BolaoSelector.tsx`** | Dropdown no header para selecionar bolão ativo. Lista bolões do usuário. |
| 13 | `src/components/ui/Layout.tsx` | Adicionar `<BolaoSelector />` no header (entre logo e nav) |
| 14 | `src/App.tsx` | Passar `activeBolao` via contexto (já incluso no AuthContext) |
| 15 | `src/pages/HomePage.tsx` | Palpites e jogos filtrados por `activeBolao.id` (passar `bolao_id` ao salvar) |
| 16 | `src/pages/LeaderboardPage.tsx` | Leaderboard filtrado por `activeBolao.id` |
| 17 | `src/pages/MyPredictionsPage.tsx` | Palpites filtrados por `activeBolao.id` |
| 18 | `src/pages/AdminPage.tsx` | Nova aba "Bolões": criar bolão, listar bolões, adicionar/remover membros (chama Edge Function `manage-boloes`) |
| 19 | `src/hooks/usePredictions.ts` | Adicionar `.eq('bolao_id', activeBolaoId)` nas queries |
| 20 | `src/hooks/useAllPredictions.ts` | Adicionar `.eq('bolao_id', activeBolaoId)` nas queries |
| 21 | `src/hooks/useLeaderboard.ts` | Adicionar `.eq('bolao_id', activeBolaoId)` nas queries + snapshot |

---

## 📊 Resumo

| Camada | Arquivos alterados | Arquivos novos | Total |
|--------|-------------------|----------------|-------|
| SQL | 1 (migration) | 0 | 1 |
| Edge Functions | 2 | 1 | 3 |
| Frontend | 10 | 2 | 12 |
| **Total** | **13** | **3** | **16** |

---

## 🔄 Fluxo de Migração dos Dados Existentes

1. Criar bolão "Família" com `id` fixo
2. Adicionar todos os usuários da tabela `profiles` como membros do bolão "Família"
3. Adicionar coluna `bolao_id UUID NULL` em `predictions`
4. Preencher `bolao_id` com o id do bolão "Família" para todos os registros
5. Tornar `bolao_id NOT NULL`
6. Dropar UNIQUE constraint antiga, criar nova `(user_id, match_id, bolao_id)`
7. Mesmo processo para `rankings_snapshot`

**Risco:** baixo — a migração é reversível e preserva todos os dados. O bolão "Família" vira o bolão default e a experiência do usuário não muda até que novos bolões sejam criados.

---

## ✅ Factibilidade

**Totalmente factível.** As mudanças são incrementais e bem delimitadas. Nenhuma reescrita de lógica core é necessária — apenas adição de um filtro transversal (`bolao_id`) que permeia todas as queries. O RLS do Supabase garante isolamento automático entre bolões no backend.

**Estimativa de esforço:** 3–4 horas de implementação + 1 hora de testes/migração.

---

> 📅 Documento criado em 10/06/2026

# Plano: Bolão Turbo (Pontuação Paralela) — v2

## Objetivo

Pontuação alternativa independente. Nenhuma alteração no `calculate-scores` existente.

---

## Regras

### Multiplicador por posição (catch-up)

Base: 8/6/4/2 × multiplicador da rodada = pontos base (igual ao normal).  
Depois aplica o multiplicador turbo baseado na posição **no início de cada jogo**:

| Posição | Multiplicador turbo |
|---------|--------------------|
| 1º | ×1.0 |
| 2º-3º | ×1.2 |
| 4º-6º | ×1.5 |
| 7º+ | ×2.0 |

### Processamento jogo a jogo

1. Ordenar jogos do mata-mata por `match_date ASC`
2. Para cada jogo, ver ranking turbo acumulado até aqui
3. Para cada palpite desse jogo, aplicar: `basePts × turboMultiplier`
4. Atualizar ranking turbo (somar os novos pontos)
5. Próximo jogo repete do passo 2

---

## Novos componentes

### Tabela: `turbo_scores`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | serial PK | |
| `user_id` | uuid FK → profiles | |
| `bolao_id` | uuid FK → boloes | |
| `match_id` | int FK → matches | |
| `base_points` | int | Pontos sem o multiplicador turbo |
| `turbo_multiplier` | numeric | Multiplicador aplicado |
| `final_points` | int | base × turbo |
| `position_at_time` | int | Posição no ranking turbo na hora do jogo |
| `detail` | text | exact/winner_diff/winner/one_team_goals |

**UNIQUE:** `(user_id, match_id, bolao_id)` — igual a `predictions`.

### Edge Function: `calculate-turbo`

- Nova, separada de `calculate-scores`
- Processa mata-mata jogo a jogo
- Para cada jogo: calcula posições atuais → aplica multiplicador → insere em `turbo_scores`

### Página: `TurboLeaderboardPage`

- Mesma estrutura da leaderboard normal, mas soma `final_points` da tabela `turbo_scores`
- Mostra o multiplicador atual de cada jogador

### Admin: novo botão "⚡ Calcular Turbo"

---

## Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `supabase/migration_turbo.sql` | Nova tabela `turbo_scores` + RLS |
| 2 | `supabase/functions/calculate-turbo/index.ts` | Nova Edge Function |
| 3 | `src/types/index.ts` | Tipo `TurboScore` |
| 4 | `src/hooks/useTurboLeaderboard.ts` | Hook de ranking turbo |
| 5 | `src/pages/TurboLeaderboardPage.tsx` | Página de ranking turbo |
| 6 | `src/App.tsx` | Rota `/turbo` |
| 7 | `src/components/ui/Layout.tsx` | Link "⚡ Turbo" no menu |
| 8 | `src/pages/AdminPage.tsx` | Botão "⚡ Turbo" no SyncTab |

**Total: 8 arquivos, ~200 linhas.**

---

## Exemplo

Jogador Pedro começa em 7º (×2.0). No jogo 1 das oitavas, acerta o placar exato:

- Base: 8 × 1.5 (R16) = 12 pts
- Turbo: 12 × 2.0 = 24 pts
- Ele sobe para 5º → próximo jogo usa ×1.5

Jogador João começa em 1º (×1.0):

- Mesmo acerto: 12 × 1.0 = 12 pts
- Continua em 1º → próximo jogo ainda ×1.0

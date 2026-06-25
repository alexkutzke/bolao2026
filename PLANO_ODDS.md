# Plano: Odds baseadas nos palpites da comunidade

## Objetivo

Exibir no card de cada jogo um resumo visual das expectativas coletivas, baseado nos palpites já registrados por todos os participantes do bolão. Opcionalmente, incluir retrospecto recente dos times.

---

## Escopo fase 1 — Odds por palpites (sem custo extra)

### Cálculo (puramente no frontend)

Os dados já estão no navegador: `allPredictions` contém todos os palpites do bolão para o jogo. O cálculo é trivial:

```
total = palpites.length
homeWins = count(p.home > p.away)
draws = count(p.home == p.away)
awayWins = count(p.away > p.home)

homeWin% = homeWins / total * 100
draw% = draws / total * 100
awayWin% = awayWins / total * 100

mostCommonScore = moda dos placares
avgHomeGoals = average(p.home)
avgAwayGoals = average(p.away)
```

**Custo computacional:** zero — é feito em memória no navegador a cada render.

### Exibição visual

Dentro do card, abaixo ou no lugar dos palpites colapsados, mostrar barras de probabilidade:

```
Expectativa do bolão (8 palpites)

Casa  ████████████░░░░░░░░  62%
Empate  ████░░░░░░░░░░░░░░  12%
Fora    █████░░░░░░░░░░░░░  25%

Placar mais comum: 2×1
Média de gols: 1.9 × 0.8
```

### Arquivos alterados

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `src/components/MatchCard.tsx` | Adicionar seção de odds abaixo dos palpites |
| 2 | `src/lib/odds.ts` (novo) | Função pura: `computeOdds(predictions)` |

**Total: 2 arquivos, ~50 linhas.**

---

## Escopo fase 2 — Retrospecto dos times (custo baixo)

### Fonte de dados

Já temos a tabela `matches` com todos os jogos e resultados. Para cada time, podemos buscar os últimos N jogos finalizados.

### Abordagem

Criar um hook `useTeamHistory(teamId)` que consulta o Supabase:

```sql
SELECT * FROM matches
WHERE finished = true
AND (home_team_id = $1 OR away_team_id = $1)
ORDER BY match_date DESC
LIMIT 5
```

Para 2 times por card = 2 queries. Com dezenas de cards visíveis, isso satura o plano gratuito.

### Otimização

**Pré-carregar tudo uma vez** (como já fazemos com times/estádios):

1. Tabela `team_history` preenchida pela Edge Function `sync-matches`
2. Ou: carregar todos os resultados de uma vez no frontend e indexar por `team_id`
3. Hook `useAllTeamHistory()` → `Map<teamId, lastResults[]>`

### Custo

| Abordagem | Queries por carregamento | Custo |
|-----------|-------------------------|-------|
| Query por time | 96 queries (48 times × 2) | ❌ Inviável |
| Tudo de uma vez | 1 query (`SELECT * FROM matches WHERE finished = true`) | ✅ ~100 linhas |
| Cache em tabela | 1 query no hook | ✅ trivial |

**Recomendação:** carregar tudo de uma vez. 104 jogos × ~100 bytes = 10 KB. Desprezível.

### Arquivos fase 2

| # | Arquivo | Alteração |
|---|---------|-----------|
| 3 | `src/hooks/useTeamHistory.ts` (novo) | Hook para retrospecto |
| 4 | `src/lib/odds.ts` | Estender com `computeTeamForm(history)` |
| 5 | `src/components/MatchCard.tsx` | Exibir form dos times (ex: `✅✅❌✅✅`) |

**Total fase 2: +3 arquivos, ~60 linhas.**

---

## Conclusão

| Fase | Arquivos | Linhas estimadas | Custo Supabase |
|------|----------|-----------------|----------------|
| Fase 1 (odds) | 2 | ~50 | Zero (cálculo no frontend) |
| Fase 2 (retrospecto) | 3 | ~60 | 1 query extra (10 KB) |
| **Total** | **5** | **~110** | **Trivial para o plano gratuito** |

A fase 1 pode ser implementada imediatamente. A fase 2 é opcional e de baixíssimo custo.

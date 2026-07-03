# Plano 1: Critérios de Desempate

## Situação atual

O ranking ordena apenas por `total_points DESC`. Usuários com mesma pontuação ficam em ordem arbitrária (dependendo da ordem de inserção).

## Critérios propostos (em ordem)

| # | Critério | Descrição |
|---|----------|-----------|
| 1º | Total de pontos | Quanto maior, melhor |
| 2º | Placar exato | Quem acertou mais placares exatos |
| 3º | Vencedor + diferença | Quem acertou mais V+D |
| 4º | Vencedor / empate | Quem acertou mais vencedores |
| 5º | Gols de um time | Quem acertou mais gols de um time |
| 6º | **Data de cadastro** | Usuário mais antigo vence (fallback) |

## Onde muda

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useLeaderboard.ts` | Ordenação com múltiplos critérios + fallback por `created_at` |
| `src/types/index.ts` | Adicionar `created_at` no `LeaderboardEntry` |

**Total: 2 arquivos, ~8 linhas alteradas.**

## Nota

O fallback por data de cadastro é determinístico e evita empates sem solução. Como o admin cria os usuários, não há risco de dois usuários com o mesmo `created_at` (a menos que criados na mesma transação, o que é improvável).

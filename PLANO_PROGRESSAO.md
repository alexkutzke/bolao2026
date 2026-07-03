# Plano 2: Pontuação Progressiva por Rodada (Mata-mata)

## Situação atual

Todo o mata-mata usa a mesma pontuação: 8/6/4/2 pts.

## Proposta: multiplicador por rodada

Usar o `matchday` (que vai de 4 a 9 no mata-mata) como base para um multiplicador:

| Rodada | Matchday | Fase | Multiplicador | Pontuação |
|--------|----------|------|---------------|-----------|
| 4 | 4 | 16 avos (R32) | ×1.0 | 8 / 6 / 4 / 2 |
| 5 | 5 | Oitavas (R16) | ×1.5 | 12 / 9 / 6 / 3 |
| 6 | 6 | Quartas (QF) | ×2.0 | 16 / 12 / 8 / 4 |
| 7 | 7 | Semis (SF) | ×2.5 | 20 / 15 / 10 / 5 |
| 8 | 8 | 3º lugar | ×2.5 | 20 / 15 / 10 / 5 |
| 9 | 9 | Final | ×3.0 | 24 / 18 / 12 / 6 |

**Por que 0.5 em 0.5?** Com base 8/6/4/2 (todos pares), qualquer múltiplo de 0.5 gera números inteiros. Sem decimais, sem arredondamento.

## Onde muda

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/scoring.ts` | `calculatePoints` recebe `matchday`, calcula multiplicador |
| `supabase/functions/calculate-scores/index.ts` | Passa `matchday` (precisa incluir no SELECT) |
| `src/pages/LeaderboardPage.tsx` | Atualizar texto das regras |
| `src/pages/RulesPage.tsx` | Atualizar texto das regras |

**Total: 4 arquivos, ~25 linhas alteradas.**

## Cálculo do multiplicador

```typescript
function getMultiplier(matchday: number): number {
  if (matchday <= 4) return 1;    // Grupos + R32
  if (matchday === 5) return 1.5; // R16
  if (matchday === 6) return 2;   // QF
  if (matchday === 7) return 2.5; // SF
  if (matchday === 8) return 2.5; // 3rd place
  if (matchday === 9) return 3;   // Final
  return 1;
}

const pts = basePoints * multiplier;
```

## Nota sobre competitividade

A progressão proposta (×1.0 → ×1.5 → ×2.0 → ×2.5 → ×3.0) faz com que um palpite exato na final (24 pts) valha **3× mais** que um nas oitavas (8 pts), mantendo o bolão emocionante até o último jogo. É um equilíbrio saudável — não tão agressivo quanto 50% composto (que chegaria a ~41 pts na final) nem tão plano quanto pontuação fixa.

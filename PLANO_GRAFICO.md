# Plano: Gráfico de Pontos ao Longo do Tempo

## Objetivo

Adicionar um gráfico de linhas na tela de pontuação normal mostrando a evolução dos pontos acumulados de cada participante ao longo dos jogos.

---

## Layout sugerido

Duas abas dentro da tela de pontuação:

| Aba | Conteúdo |
|-----|----------|
| 📊 Classificação | Tabela de pontos atual (já existe) |
| 📈 Evolução | Gráfico de linhas com pontos acumulados |

---

## Biblioteca de gráficos

**Chart.js + react-chartjs-2** (~100 KB gzipped, ~30 KB a mais no bundle)

```
npm install chart.js react-chartjs-2
```

Alternativa mais leve: **µPlot** (~20 KB gzipped) mas com API menos React-friendly.

---

## Dados

### Hook: `usePointsOverTime(stage, bolaoId)`

```sql
SELECT p.user_id, pr.name, p.points, m.match_date, m.matchday, m.group_name
FROM predictions p
JOIN profiles pr ON pr.id = p.user_id
JOIN matches m ON m.id = p.match_id
WHERE m.stage = $stage AND p.bolao_id = $bolaoId AND p.points IS NOT NULL
ORDER BY m.match_date ASC
```

Processamento no frontend:
1. Agrupar por `(user_id, match_date)`
2. Para cada usuário, computar soma acumulada
3. Eixo X: data do jogo (ou rótulo "Rodada N")
4. Eixo Y: pontos acumulados

---

## Arquivos

| # | Arquivo | Alteração | Linhas |
|---|---------|-----------|--------|
| 1 | `package.json` | Adicionar `chart.js` + `react-chartjs-2` | +2 |
| 2 | `src/hooks/usePointsOverTime.ts` | Hook para buscar e processar dados | ~40 |
| 3 | `src/components/PointsChart.tsx` | Componente do gráfico | ~50 |
| 4 | `src/pages/LeaderboardPage.tsx` | Adicionar abas (Classificação / Evolução) | ~20 |

---

## Custo

| Recurso | Estimativa |
|---------|------------|
| Bundle adicional | ~30 KB gzipped |
| Queries Supabase | 1 extra por estágio (group/knockout) |
| Linhas de código | ~110 |
| Arquivos alterados | 4 |

**Esforço:** baixo (~30 min). **Risco:** nenhum — não mexe na pontuação, só adiciona visualização.

---

## Exemplo visual

```
📈 Evolução — Fase de Grupos

Pts
240 ┤                                    ╭─ João
200 ┤                              ╭────╯
160 ┤                        ╭────╯
120 ┤                  ╭────╯     ╭─ Maria
 80 ┤            ╭────╯    ╭────╯
 40 ┤      ╭────╯   ╭────╯
  0 ┤─────╯────────╯─────────────────────────
      11/06  15/06  19/06  23/06  27/06
```

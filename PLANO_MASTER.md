# Plano: Palpite Master (Final)

## Objetivo

Palpite especial feito até o final de hoje (08/07/2026) onde o participante chuta os finalistas e o placar da final. É secreto — só o próprio usuário e o admin veem o conteúdo. Os demais veem apenas quantos palpites master já foram feitos.

---

## Sugestão de pontuação

| Acerto | Pontos | Justificativa |
|--------|--------|---------------|
| Ambos os finalistas corretos | 25 pts | Quem estará na final |
| Placar exato da final | 30 pts | Acertar o placar da final |
| **Total máximo possível** | **55 pts** | ~2.5 placares exatos na final (×3 = 24 pts cada) |

> 55 pts é o equivalente a ~2.3 placares exatos na final (×3 = 24 pts cada). É um bônus relevante — pode mudar posições no pódio — sem anular o desempenho acumulado nas 7 rodadas anteriores do mata-mata.

---

## Modelo de dados

### Nova tabela: `master_predictions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | serial PK | |
| `user_id` | uuid FK → profiles | Quem fez o palpite |
| `bolao_id` | uuid FK → boloes | Qual bolão |
| `home_team_id` | text | ID do time campeão (ou finalista A) |
| `away_team_id` | text | ID do vice (ou finalista B) |
| `home_score` | int | Placar da final (campeão) |
| `away_score` | int | Placar da final (vice) |
| `points` | int (null) | Calculado após a final |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**UNIQUE:** `(user_id, bolao_id)` — um palpite master por bolão.

### RLS

- Usuário vê/edita **apenas o próprio** palpite master
- Admin vê todos (para auditoria)
- Todos veem o **count** (`SELECT count(*) FROM master_predictions WHERE bolao_id = ...`)

---

## Frontend

### Nova página: `MasterPredictionPage`

- Acessível pelo menu ("Palpite Final")
- Se o usuário já fez: mostra seu palpite (editável até o prazo)
- Se não fez: formulário com 2 dropdowns de times (48 opções) + placar
- Mostra: "X de Y participantes já fizeram o palpite master"
- Após o prazo (início da final): palpite travado, conteúdo visível para todos

### No MatchCard / HomePage

- Banner no topo enquanto prazo não expirou: "⚠️ Não esqueça o Palpite Master!"
- Após o prazo e antes da revelação: card mostra apenas "🔒 Palpite master registrado"

### Na LeaderboardPage

- Nova coluna "Master" com os pontos do palpite master (quando revelado)
- Ou: os pontos são somados ao total do mata-mata

---

## Fluxo de revelação

1. Admin sincroniza o resultado da final
2. Ao calcular pontos (após a final), a função também calcula os `master_predictions.points`
3. Os palpites master se tornam **públicos** automaticamente (RLS é atualizada ou uma flag `revealed = true`)

---

## Arquivos afetados

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `supabase/migration_master.sql` | Nova tabela + RLS |
| 2 | `supabase/functions/calculate-scores/index.ts` | Calcular pontos master |
| 3 | `src/types/index.ts` | Tipo `MasterPrediction` |
| 4 | `src/hooks/useMasterPrediction.ts` | CRUD do palpite master |
| 5 | `src/pages/MasterPredictionPage.tsx` | Página do palpite |
| 6 | `src/App.tsx` | Rota `/master` |
| 7 | `src/components/ui/Layout.tsx` | Link "Palpite Final" |
| 8 | `src/pages/HomePage.tsx` | Banner de lembrete |
| 9 | `src/pages/LeaderboardPage.tsx` | Coluna de pontos master (opcional) |

**Total: 9 arquivos, ~200 linhas.**

---

## Prazo

O palpite master pode ser feito/editado até **o início da final** (19/07/2026). A data exata vem do banco (`matches.match_date` onde `group_name = 'FINAL'`).

---

## Nota sobre sigilo

Para que o palpite seja realmente secreto, usamos RLS com `USING (user_id = auth.uid() OR is_admin = true)`. O count é obtido via uma função `SECURITY DEFINER` que agrega sem expor dados individuais:

```sql
CREATE OR REPLACE FUNCTION master_count(bolao_id uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*) FROM master_predictions WHERE bolao_id = $1;
$$;
```

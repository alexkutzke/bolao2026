# 🏆 Bolão Copa do Mundo 2026 — Plano da Aplicação

## 1. Visão Geral

Plataforma web familiar para registro de palpites dos jogos da Copa do Mundo FIFA 2026. Cada membro da família tem seu login, um administrador gerencia os acessos, e o sistema calcula automaticamente a pontuação conforme os resultados reais dos jogos.

**Premiação em duas fases:**
- **Fase 1 (Grupos):** Jogos da fase de grupos (72 partidas, grupos A–L)
- **Fase 2 (Mata-mata):** Oitavas, quartas, semis, 3º lugar e final (32 partidas)

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | React 18 + TypeScript + Vite | SPA moderna, rápida, com tipagem segura |
| **Estilos** | Tailwind CSS | Produtividade, design responsivo e amigável |
| **Roteamento** | React Router (HashRouter) | Necessário para GitHub Pages (SPA sem servidor) |
| **Backend/Auth** | **Supabase** | PostgreSQL relacional, Auth gratuito, Edge Functions |
| **Banco** | PostgreSQL (Supabase) | Ideal para consultas de leaderboard e somatórios |
| **API externa** | [worldcup26.ir](https://worldcup26.ir/api-docs) | Dados de jogos, times, resultados (gratuito, sem API key) |
| **Hospedagem** | GitHub Pages | Gratuito, já configurado com workflow CI/CD |
| **CI/CD** | GitHub Actions | Deploy automático ao push na main |

---

## 3. API Externa: worldcup26.ir

**Base URL:** `https://worldcup26.ir`

| Endpoint | Descrição | Usado para |
|----------|-----------|------------|
| `GET /get/games` | Todos os 104 jogos com nomes dos times | Sincronizar lista de jogos e resultados |
| `GET /get/teams` | Todos os 48 times com bandeiras | Exibir times e bandeiras |
| `GET /get/group?name=A` | Grupo específico com tabela | Tabela de classificação dos grupos |
| `GET /get/game/{id}` | Jogo específico por ID | Atualizar resultado de um jogo |
| `GET /get/stadiums` | Todos os estádios | Informações dos estádios |
| `GET /health` | Health check | Monitorar disponibilidade da API |

**Campos importantes do Jogo (Game):**
```json
{
  "id": "1",                    // ID público (1-104)
  "home_team_id": "1",          // ID do time da casa
  "away_team_id": "2",          // ID do time visitante
  "home_score": "2",            // Placar casa
  "away_score": "1",            // Placar visitante
  "group": "A",                 // Grupo (A-L) ou fase (R32, R16, QF, SF, 3RD, FINAL)
  "matchday": "1",              // Rodada (1-9)
  "date": "2026-06-11T13:00:00.000Z",  // Data ISO
  "local_date": "06/11/2026 13:00",    // Data local
  "stadium_id": "1",            // ID do estádio
  "finished": "TRUE",           // "TRUE"/"FALSE"
  "time_elapsed": "FT",         // "notstarted", "45", "HT", "FT"
  "type": "group",              // "group", "r32", "r16", "qf", "sf", "third", "final"
  "home_team_name_en": "Mexico",
  "home_team_name_fa": "مکزیک",
  "away_team_name_en": "South Africa",
  "away_team_name_fa": "آفریقای جنوبی"
}
```

> ⚠️ **Importante:** Jogos de mata-mata têm `home_team_id: "0"` e `away_team_id: "0"` até os times serem definidos. Nesses casos, há labels como `home_team_label: "Winner Match 86"`.

---

## 4. Sistema de Pontuação

| Acerto | Pontos | Exemplo |
|--------|--------|---------|
| **Placar exato** | **10 pts** | Palpite: 2×1 / Real: 2×1 |
| **Vencedor + saldo de gols** | **7 pts** | Palpite: 3×1 / Real: 2×0 (acertou vencedor e diferença de 2 gols) |
| **Vencedor correto** | **4 pts** | Palpite: 1×0 / Real: 3×1 (acertou só quem ganhou) |
| **Gols de um time** | **2 pts** | Palpite: 2×1 / Real: 2×0 (acertou os 2 gols do time da casa) |

> Regras:
> - Apenas a **maior pontuação** é atribuída por jogo (não acumula).
> - Empate: acertar placar exato (10 pts) ou acertar que foi empate (4 pts).
> - Para "Vencedor + saldo": se o palpite foi empate mas o jogo teve vencedor, não pontua nessa categoria.
> - "Gols de um time" vale para qualquer um dos times (casa ou visitante).

---

## 5. Estrutura do Banco de Dados (Supabase)

### Tabela: `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` (PK) | Vinculado ao `auth.users.id` |
| `name` | `text` | Nome de exibição |
| `email` | `text` | Email (igual ao auth.users.email) |
| `is_admin` | `boolean` | Define se é administrador |
| `created_at` | `timestamptz` | Data de criação |

### Tabela: `matches`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `serial` (PK) | ID interno |
| `api_id` | `int` (UNIQUE) | ID do jogo na API (1-104) |
| `home_team_id` | `text` | ID do time da casa na API |
| `away_team_id` | `text` | ID do time visitante na API |
| `home_team_name` | `text` | Nome do time da casa (EN) |
| `away_team_name` | `text` | Nome do time visitante (EN) |
| `home_score` | `int` | Gols do time da casa (null se não jogado) |
| `away_score` | `int` | Gols do time visitante (null se não jogado) |
| `group_name` | `text` | Grupo ou fase (A-L, R32, R16, QF, SF, 3RD, FINAL) |
| `matchday` | `int` | Rodada (1-9) |
| `match_date` | `timestamptz` | Data/hora do jogo |
| `stadium` | `text` | Nome do estádio |
| `stage` | `text` | Tipo: "group" ou "knockout" |
| `finished` | `boolean` | Jogo encerrado? |
| `home_team_label` | `text` | Label para mata-mata (ex: "Winner Match 86") |
| `away_team_label` | `text` | Label para mata-mata |
| `updated_at` | `timestamptz` | Última atualização |
| `manually_set` | `boolean` | Se true, sync da API não sobrescreve resultado |

### Tabela: `predictions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `serial` (PK) | ID interno |
| `user_id` | `uuid` (FK → profiles.id) | Quem fez o palpite |
| `match_id` | `int` (FK → matches.id) | Qual jogo |
| `home_score` | `int` | Palpite gols casa |
| `away_score` | `int` | Palpite gols visitante |
| `points` | `int` | Pontos ganhos (calculado, null até apuração) |
| `points_detail` | `text` | Detalhe: "exact", "winner_diff", "winner", "one_team_goals", null |
| `created_at` | `timestamptz` | Data do palpite |
| `updated_at` | `timestamptz` | Última edição |

> **UNIQUE:** `(user_id, match_id)` — um palpite por usuário por jogo.

### Tabela: `competitions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `serial` (PK) | ID interno |
| `name` | `text` | "Fase de Grupos" / "Mata-mata" |
| `slug` | `text` (UNIQUE) | "group" / "knockout" |

### View: `leaderboard`
View materializada ou query que soma os pontos por `user_id` e `competition`.

```sql
SELECT 
  p.user_id,
  pr.name,
  SUM(pred.points) as total_points,
  COUNT(CASE WHEN pred.points_detail = 'exact' THEN 1 END) as exact_scores,
  COUNT(CASE WHEN pred.points_detail = 'winner_diff' THEN 1 END) as winner_diff,
  COUNT(CASE WHEN pred.points_detail = 'winner' THEN 1 END) as winners,
  COUNT(CASE WHEN pred.points_detail = 'one_team_goals' THEN 1 END) as one_team_goals
FROM predictions pred
JOIN profiles pr ON pr.id = pred.user_id
JOIN matches m ON m.id = pred.match_id
WHERE pred.points IS NOT NULL
GROUP BY p.user_id, pr.name
ORDER BY total_points DESC;
```

---

## 6. Estrutura do Frontend (React)

```
src/
├── main.tsx                   # Entry point
├── App.tsx                    # App com Router
├── index.css                  # Tailwind + estilos globais
├── lib/
│   └── supabase.ts            # Cliente Supabase
│   └── api.ts                 # Funções para worldcup26.ir
│   └── scoring.ts             # Lógica de cálculo de pontos
├── contexts/
│   └── AuthContext.tsx         # Contexto de autenticação
├── hooks/
│   └── useAuth.ts             # Hook de auth
│   └── useMatches.ts          # Hook de jogos
│   └── usePredictions.ts      # Hook de palpites
│   └── useLeaderboard.ts      # Hook de leaderboard
├── components/
│   ├── ui/                    # Componentes de UI reutilizáveis
│   │   ├── Layout.tsx         # Layout principal (header/sidebar)
│   │   ├── ProtectedRoute.tsx # Rota protegida por login
│   │   ├── LoadingSpinner.tsx
│   │   └── Toast.tsx
│   ├── MatchCard.tsx          # Card de jogo com placar/time
│   ├── PredictionForm.tsx     # Formulário de palpite
│   ├── LeaderboardTable.tsx   # Tabela de classificação
│   ├── TeamFlag.tsx           # Bandeira do time
│   └── AdminSyncButton.tsx    # Botão de sincronização (admin)
├── pages/
│   ├── LoginPage.tsx          # Login
│   ├── HomePage.tsx           # Lista de jogos filtrados
│   ├── MyPredictionsPage.tsx  # Meus palpites
│   ├── LeaderboardPage.tsx    # Quadro de pontos
│   └── AdminPage.tsx          # Painel do admin
└── types/
    └── index.ts               # Tipos TypeScript
```

### Rotas (HashRouter)
| Path | Página | Descrição |
|------|--------|-----------|
| `#/` | HomePage | Lista de jogos com filtro por grupo/fase |
| `#/login` | LoginPage | Login com email/senha |
| `#/predictions` | MyPredictionsPage | Palpites do usuário logado |
| `#/leaderboard` | LeaderboardPage | Quadro de pontos com tabs Grupos/Mata-mata |
| `#/admin` | AdminPage | Painel admin: sincronizar jogos, calcular pontos, gerenciar usuários |

---

## 7. Fluxos Principais

### 7.1 Autenticação
1. Admin cria contas via painel admin (usa Supabase Admin API ou `auth.admin.createUser`)
2. Usuário recebe email com senha temporária (definida pelo admin)
3. Usuário faz login com email/senha
4. Sessão gerenciada pelo Supabase Auth (cookie/localStorage)

### 7.2 Sincronização de Jogos (Ação do Admin)
1. Admin clica "Sincronizar Jogos" no painel
2. Frontend chama Edge Function `sync-matches`
3. Edge Function busca `GET /get/games` da API worldcup26.ir
4. Upsert dos jogos na tabela `matches`
5. Resultados (`home_score`, `away_score`, `finished`) são atualizados
6. Frontend reflete os dados atualizados

### 7.3 Registro de Palpites
1. Usuário vê lista de jogos (filtrada por grupo/fase)
2. Para cada jogo ainda não iniciado (`date > now`), pode submeter palpite
3. Palpite: dois campos numéricos (gols casa, gols visitante)
4. Pode editar até o horário do jogo
5. Após início do jogo, palpite fica bloqueado

### 7.4 Lançamento Manual de Resultados (Admin)
Caso a API externa esteja indisponível, desatualizada, ou não tenha os resultados:

1. Admin acessa o painel e vê lista de jogos passados (`date < now`) com resultados pendentes
2. Para cada jogo, pode preencher manualmente:
   - `home_score` (gols do time da casa)
   - `away_score` (gols do time visitante)
   - Checkbox `finished` (marca como encerrado)
3. Também pode editar resultados já sincronizados (caso a API tenha dado incorreto)
4. Ao salvar, o frontend faz update direto na tabela `matches` (via Supabase client com RLS para admin)
5. No mata-mata, pode também definir manualmente qual time avançou (`home_team_id`/`away_team_id`)

> O lançamento manual SEMPRE prevalece sobre o dado da API. Se um resultado foi lançado manualmente, a sincronização da API não o sobrescreve (flag `manually_set = true` na tabela).

### 7.5 Cálculo de Pontos (Ação do Admin)
1. Admin clica "Calcular Pontos" no painel
2. Edge Function `calculate-scores`:
   - Para cada jogo `finished = true`
   - Para cada `prediction` daquele jogo com `points IS NULL`
   - Calcula pontos conforme regras
   - Atualiza `predictions.points` e `predictions.points_detail`
3. Opção futura: agendar via `pg_cron` para execução diária automática

### 7.6 Leaderboard
1. Query que soma pontos por usuário e competição
2. Visualização com duas abas: "Fase de Grupos" e "Mata-mata"
3. Colunas: Posição, Nome, Pontos, Placar Exato, Vencedor+Saldo, Vencedor, Gols Time
4. Ordenado por pontos decrescentes

---

## 8. Regras de Negócio Importantes

### Palpites no Mata-mata
- Jogos de mata-mata (R32, R16, QF, SF, 3RD, FINAL) só ficam disponíveis para palpitar **após os times serem definidos**.
- Exemplo: o jogo "Vencedor Jogo 86 vs Vencedor Jogo 88" só libera palpites quando os jogos 86 e 88 terminarem e os times forem conhecidos.
- A sincronização da API atualizará `home_team_id` de `"0"` para o ID real do time classificado.

### Deadlines
- Palpites podem ser feitos/editados até o horário de início do jogo (`match_date`).
- Após `match_date`, o formulário de palpite fica desabilitado.

### Duas Competições Separadas
- **Grupos:** `matches.stage = 'group'` (jogos 1-72)
- **Mata-mata:** `matches.stage = 'knockout'` (jogos 73-104)
- Leaderboards são independentes para cada competição.

---

## 9. Edge Functions (Supabase)

### `sync-matches`
```typescript
// Busca jogos da API worldcup26.ir e faz upsert
// Chamada: manual pelo admin ou agendada
```

### `calculate-scores`
```typescript
// Calcula pontos de todos os palpites para jogos finalizados
// Chamada: manual pelo admin ou agendada
```

### `create-user` (opcional)
```typescript
// Admin cria novo usuário (email + senha temporária)
// Alternativa: usar direto o Supabase dashboard
```

---

## 10. GitHub Pages — Deploy

### Configuração do Vite (`vite.config.ts`)
```typescript
export default defineConfig({
  base: '/bolao_copa_2026/',  // Nome do repositório
  build: { outDir: 'dist' }
});
```

### Workflow (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
      - uses: actions/deploy-pages@v4
```

### Variáveis de Ambiente
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configurados nos secrets do GitHub Actions e injetados no build.
- **Nunca** expor a `service_role` key no frontend.

---

## 11. Interface do Usuário — Wireframe Conceitual

### Home (Jogos)
```
┌──────────────────────────────────────────────┐
│  🏆 Bolão Copa 2026        👤 João  [Sair]  │
├──────────────────────────────────────────────┤
│  [Grupos] [Mata-mata]                        │
│  Filtro: [Grupo A ▾]  [Rodada 1 ▾]          │
├──────────────────────────────────────────────┤
│  ┌──────────────────────┐ ┌────────────────┐ │
│  │ 🇲🇽 México           │ │ 🇿🇦 África Sul │ │
│  │        vs            │ │                │ │
│  │ 🏟 Estádio Azteca    │ │                │ │
│  │ 📅 11/06 13:00       │ │                │ │
│  │                      │ │                │ │
│  │ Seu palpite:         │ │                │ │
│  │ [ 2 ] × [ 1 ] 💾     │ │                │ │
│  └──────────────────────┘ └────────────────┘ │
│  (cards em grid para cada jogo)              │
└──────────────────────────────────────────────┘
```

### Quadro de Pontos
```
┌──────────────────────────────────────────────┐
│  🏆 Quadro de Pontos                         │
│  [Fase de Grupos] [Mata-mata]                │
├──────────────────────────────────────────────┤
│  #  │ Nome      │ Pts │ Exato │ V+D │ V │ G │
│  1  │ João      │ 87  │ 3     │ 4   │ 6 │ 2 │
│  2  │ Maria     │ 72  │ 2     │ 3   │ 5 │ 1 │
│  3  │ Pedro     │ 65  │ 1     │ 2   │ 7 │ 3 │
│  4  │ Ana       │ 58  │ 1     │ 1   │ 6 │ 0 │
└──────────────────────────────────────────────┘
```

### Admin
```
┌──────────────────────────────────────────────┐
│  ⚙️ Painel Administrativo                    │
├──────────────────────────────────────────────┤
│  [Sincronizar Jogos]  [Calcular Pontos]      │
│                                               │
│  Status: ✅ 104 jogos sincronizados           │
│  Última sincronização: 11/06/2026 08:30      │
│  Último cálculo: 11/06/2026 08:31            │
│  Jogos finalizados: 15                        │
│                                               │
│  ─── Lançar Resultados ───                   │
│  🇲🇽 México  [2] × [1] 🇿🇦 África Sul [Salvar]│
│  🇧🇷 Brasil  [_] × [_] 🇲🇦 Marrocos   [Salvar]│
│  (lista de jogos passados pendentes)          │
│                                               │
│  ─── Gerenciar Usuários ───                  │
│  [+ Novo Usuário]                             │
│  João (joao@email.com)      [Remover]        │
│  Maria (maria@email.com)    [Remover]        │
└──────────────────────────────────────────────┘
```

---

## 12. Plano de Implementação

### Fase 1 — Setup (2-3 dias)
- [ ] Criar projeto Vite + React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar HashRouter
- [ ] Criar projeto no Supabase
- [ ] Configurar tabelas no Supabase (SQL migration)
- [ ] Configurar cliente Supabase no frontend
- [ ] Configurar GitHub Actions workflow

### Fase 2 — Autenticação (1-2 dias)
- [ ] Tela de login
- [ ] Contexto de autenticação (AuthContext)
- [ ] ProtectedRoute
- [ ] Página admin com criação de usuários
- [ ] Layout com header e logout

### Fase 3 — Jogos e Palpites (4-5 dias)
- [ ] Edge Function `sync-matches`
- [ ] Página Home com cards de jogos
- [ ] Filtros por grupo/fase/rodada
- [ ] Formulário de palpite
- [ ] Página "Meus Palpites"
- [ ] Bloqueio de palpites após deadline
- [ ] Lançamento manual de resultados pelo admin (fallback da API)

### Fase 4 — Pontuação (2-3 dias)
- [ ] Lógica de cálculo de pontos (`scoring.ts`)
- [ ] Edge Function `calculate-scores`
- [ ] Botão admin para disparar cálculo
- [ ] Testes unitários da lógica de pontuação

### Fase 5 — Leaderboard (1-2 dias)
- [ ] Página de quadro de pontos
- [ ] Tabs Grupos / Mata-mata
- [ ] Estatísticas detalhadas (placares exatos, etc.)

### Fase 6 — Polimento (2-3 dias)
- [ ] Design responsivo (mobile-first)
- [ ] Tratamento de erros e loading states
- [ ] Feedback visual (toasts, animações)
- [ ] Testes de integração
- [ ] Deploy final

---

## 13. Considerações Técnicas

### Segurança
- Supabase RLS: `predictions` só podem ser lidas/editadas pelo próprio usuário
- Admin tem políticas especiais para gerenciar tudo
- `service_role` key **nunca** exposta no frontend — usada apenas nas Edge Functions
- Variáveis de ambiente injetadas no build do GitHub Actions

### Performance
- Dados de jogos sincronizados localmente (não depende da API externa em tempo real)
- Leaderboard pode ser materializada para evitar recálculo constante
- Cache de times e bandeiras

### Limitações do Plano Gratuito Supabase
- 500 MB de banco (mais que suficiente para este projeto)
- 50.000 usuários ativos mensais (muito além da necessidade familiar)
- 2 Edge Functions gratuitas (suficiente para sync e calculate)
- `pg_cron` disponível apenas no plano Pro ($25/mês) — por isso o botão manual do admin é a alternativa gratuita

### Fallback para agendamento automático
Se futuramente quiser cálculo automático diário sem `pg_cron`:
- Usar GitHub Actions com `schedule` (cron) para chamar a Edge Function via HTTP
- Ou: service externo gratuito como [cron-job.org](https://cron-job.org)

---

## 14. Referências

- [worldcup26.ir API Docs](https://worldcup26.ir/api-docs) — Documentação Swagger completa
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment - GitHub Pages](https://vitejs.dev/guide/static-deploy.html#github-pages)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

> **Status:** ⏳ Aguardando início da implementação
> **Última atualização:** 10/06/2026

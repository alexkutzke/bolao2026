import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Match } from '../types';

export function AdminPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'sync' | 'results' | 'users'>('sync');

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">⚙️ Painel Administrativo</h1>

      <div className="flex bg-gray-900 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: 'sync' as const, label: 'Sincronização' },
          { key: 'results' as const, label: 'Lançar Resultados' },
          { key: 'users' as const, label: 'Usuários' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-green-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sync' && <SyncTab />}
      {activeTab === 'results' && <ManualResultsTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  );
}

/* ── Sync Tab ─────────────────────────────────── */

function SyncTab() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; finished: number; lastSync: string | null }>({
    total: 0,
    finished: 0,
    lastSync: null,
  });

  const loadStats = useCallback(async () => {
    const { count: total } = await supabase.from('matches').select('*', { count: 'exact', head: true });
    const { count: finished } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('finished', true);
    const { data: last } = await supabase
      .from('matches')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setStats({
      total: total || 0,
      finished: finished || 0,
      lastSync: last?.updated_at || null,
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function syncMatches() {
    setLoading(true);
    setStatus('Chamando Edge Function sync-matches...');
    try {
      const { data, error } = await supabase.functions.invoke('sync-matches');

      if (error) {
        setStatus(`❌ Erro na Edge Function: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data?.error) {
        setStatus(`❌ Erro da API: ${data.error}`);
      } else {
        setStatus(
          `✅ Sincronização concluída! ${data.synced} novos jogos, ${data.updated} atualizados (total: ${data.total}).`,
        );
        loadStats();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setStatus(`❌ Erro: ${message}`);
    }
    setLoading(false);
  }

  async function syncResults() {
    setLoading(true);
    setStatus('Buscando resultados de jogos finalizados...');
    try {
      const { data, error } = await supabase.functions.invoke('sync-results');

      if (error) {
        setStatus(`❌ Erro na Edge Function: ${error.message}`);
      } else {
        setStatus(`✅ ${data.updated} resultados atualizados (${data.total_finished} jogos finalizados na API).`);
        loadStats();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setStatus(`❌ Erro: ${message}`);
    }
    setLoading(false);
  }

  async function calculateAllScores() {
    setLoading(true);
    setStatus('Chamando Edge Function calculate-scores...');
    try {
      const { data, error } = await supabase.functions.invoke('calculate-scores');

      if (error) {
        setStatus(`❌ Erro na Edge Function: ${error.message}`);
      } else {
        setStatus(`✅ Cálculo concluído! ${data.calculated} palpites pontuados.`);
        loadStats();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setStatus(`❌ Erro: ${message}`);
    }
    setLoading(false);
  }

  const lastSyncStr = stats.lastSync
    ? new Date(stats.lastSync).toLocaleString('pt-BR')
    : 'Nunca';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Jogos sincronizados</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-2xl font-bold text-green-400">{stats.finished}</p>
          <p className="text-sm text-gray-500">Jogos finalizados</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-sm text-gray-400">{lastSyncStr}</p>
          <p className="text-sm text-gray-500">Última sincronização</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={syncMatches}
          disabled={loading}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          {loading ? 'Sincronizando...' : '🔄 Sincronizar Jogos'}
        </button>
        <button
          onClick={calculateAllScores}
          disabled={loading}
          className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          {loading ? 'Calculando...' : '📊 Calcular Pontos'}
        </button>
        <button
          onClick={syncResults}
          disabled={loading}
          className="px-5 py-2.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          {loading ? 'Sincronizando...' : '⚡ Resultados'}
        </button>
      </div>

      {status && (
        <div
          className={`p-4 rounded-lg text-sm ${
            status.startsWith('✅')
              ? 'bg-green-900/30 text-green-300 border border-green-800'
              : status.startsWith('❌')
                ? 'bg-red-900/30 text-red-300 border border-red-800'
                : status.startsWith('⚠️')
                  ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800'
                  : 'bg-blue-900/30 text-blue-300 border border-blue-800'
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}

/* ── Manual Results Tab ──────────────────────── */

function ManualResultsTab() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'past' | 'all'>('past');

  const loadMatches = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('matches').select('*').order('match_date', { ascending: true });

    if (filter === 'past') {
      query = query.lte('match_date', new Date().toISOString());
    }

    const { data } = await query;
    setMatches(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  async function saveResult(match: Match, homeScore: number, awayScore: number) {
    setSavingId(match.id);
    const { error } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        finished: true,
        manually_set: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    if (!error) {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, home_score: homeScore, away_score: awayScore, finished: true, manually_set: true }
            : m,
        ),
      );
    }
    setSavingId(null);
  }

  async function markNotFinished(match: Match) {
    setSavingId(match.id);
    await supabase
      .from('matches')
      .update({ finished: false, updated_at: new Date().toISOString() })
      .eq('id', match.id);
    setMatches((prev) =>
      prev.map((m) => (m.id === match.id ? { ...m, finished: false } : m)),
    );
    setSavingId(null);
  }

  const stageLabel = (m: Match) =>
    m.stage === 'group' ? `Grupo ${m.group_name} · Rod ${m.matchday}` : m.group_name;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter('past')}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            filter === 'past' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Jogos passados
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            filter === 'all' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Todos
        </button>
        <span className="text-xs text-gray-600 ml-auto">
          Clique para editar resultados manualmente
        </span>
      </div>

      {matches.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Nenhum jogo encontrado. Sincronize os jogos primeiro.
        </p>
      )}

      <div className="space-y-2">
        {matches.map((match) => (
          <ManualMatchRow
            key={match.id}
            match={match}
            onSave={saveResult}
            onMarkNotFinished={markNotFinished}
            saving={savingId === match.id}
            stageLabel={stageLabel(match)}
          />
        ))}
      </div>
    </div>
  );
}

function ManualMatchRow({
  match,
  onSave,
  onMarkNotFinished,
  saving,
  stageLabel,
}: {
  match: Match;
  onSave: (m: Match, h: number, a: number) => void;
  onMarkNotFinished: (m: Match) => void;
  saving: boolean;
  stageLabel: string;
}) {
  const matchDate = new Date(match.match_date);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const h = parseInt((form.elements.namedItem('home') as HTMLInputElement).value);
    const a = parseInt((form.elements.namedItem('away') as HTMLInputElement).value);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0) {
      onSave(match, h, a);
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 flex items-center gap-3 flex-wrap ${
        match.manually_set
          ? 'border-yellow-700 bg-yellow-900/10'
          : match.finished
            ? 'border-green-800 bg-gray-900/50'
            : 'border-gray-800 bg-gray-900/30'
      }`}
    >
      <span className="text-xs text-gray-500 w-24 shrink-0">{stageLabel}</span>

      <span className="text-sm font-medium w-28 truncate">
        {match.home_team_label || match.home_team_name}
      </span>

      <form onSubmit={handleSubmit} className="flex items-center gap-1">
        <input
          name="home"
          type="number"
          min="0"
          max="99"
          defaultValue={match.home_score ?? ''}
          placeholder="-"
          className="w-12 px-1.5 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        />
        <span className="text-gray-600 text-sm">×</span>
        <input
          name="away"
          type="number"
          min="0"
          max="99"
          defaultValue={match.away_score ?? ''}
          placeholder="-"
          className="w-12 px-1.5 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-2 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded transition"
        >
          {saving ? '...' : 'Salvar'}
        </button>
      </form>

      <span className="text-sm font-medium w-28 truncate text-right">
        {match.away_team_label || match.away_team_name}
      </span>

      <span className="text-xs text-gray-600">
        {matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
      </span>

      {match.manually_set && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 font-medium">
          Manual
        </span>
      )}
      {match.finished && !match.manually_set && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 font-medium">
          API
        </span>
      )}

      {match.finished && (
        <button
          onClick={() => onMarkNotFinished(match)}
          disabled={saving}
          className="text-xs text-red-400 hover:text-red-300 ml-auto"
        >
          Desmarcar
        </button>
      )}
    </div>
  );
}

/* ── Users Tab ────────────────────────────────── */

function UsersTab() {
  const [users, setUsers] = useState<{ id: string; name: string; email: string; is_admin: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setStatus('');

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { email: newEmail, password: newPassword, name: newName },
      });

      if (fnError) {
        setStatus(`❌ Erro ao chamar Edge Function: ${fnError.message}. Verifique se as funções estão deployadas.`);
        setCreating(false);
        return;
      }

      if (fnData?.error) {
        setStatus(`❌ Erro: ${fnData.error}`);
        setCreating(false);
        return;
      }

      setStatus(`✅ Usuário ${newName} criado!`);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setStatus(`❌ Erro: ${message}`);
    }
    setCreating(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Create User Form */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">➕ Criar Novo Usuário</h2>
        <form onSubmit={createUser} className="space-y-3 max-w-md">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome completo"
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Senha temporária"
            required
            minLength={6}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {creating ? 'Criando...' : 'Criar Usuário'}
          </button>
        </form>
        {status && (
          <p
            className={`mt-3 text-sm ${
              status.startsWith('✅') ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {status}
          </p>
        )}
      </div>

      {/* User List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">👥 Usuários ({users.length})</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between bg-gray-900 rounded-lg p-3 border border-gray-800"
            >
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.is_admin && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
                    Admin
                  </span>
                )}
                {!user.is_admin && (
                  <button
                    onClick={async () => {
                      await supabase
                        .from('profiles')
                        .update({ is_admin: true })
                        .eq('id', user.id);
                      loadUsers();
                    }}
                    className="text-xs text-gray-500 hover:text-green-400"
                  >
                    Tornar Admin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AuthContext';
import { useMasterPrediction } from '../hooks/useMasterPrediction';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface Team {
  id: string;
  name_en: string;
  flag_url: string;
}

export function MasterPredictionPage() {
  const { activeBolao } = useApp();
  const { prediction, count, loading, savePrediction } = useMasterPrediction();
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeam, setHomeTeam] = useState(prediction?.home_team_id || '');
  const [awayTeam, setAwayTeam] = useState(prediction?.away_team_id || '');
  const [homeScore, setHomeScore] = useState(prediction?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.away_score ?? 0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [finalStarted, setFinalStarted] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    supabase.from('teams').select('id, name_en, flag_url').order('name_en').then(({ data }) => {
      if (data) setTeams(data);
    });
    supabase.from('matches').select('match_date').eq('group_name', 'FINAL').single().then(({ data }) => {
      if (data) setFinalStarted(new Date(data.match_date) < new Date());
    });
    // Count bolão members
    if (activeBolao) {
      supabase.from('bolao_members').select('*', { count: 'exact', head: true }).eq('bolao_id', activeBolao.id).then(({ count }) => {
        setMemberCount(count || 0);
      });
    }
  }, [activeBolao]);

  useEffect(() => {
    if (prediction) {
      setHomeTeam(prediction.home_team_id);
      setAwayTeam(prediction.away_team_id);
      setHomeScore(prediction.home_score);
      setAwayScore(prediction.away_score);
    }
  }, [prediction]);

  const isLocked = finalStarted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      setMsg('Selecione dois times diferentes.');
      return;
    }
    setSaving(true);
    setMsg('');
    const { error } = await savePrediction({ home_team_id: homeTeam, away_team_id: awayTeam, home_score: homeScore, away_score: awayScore });
    if (error) setMsg(`Erro: ${typeof error === 'string' ? error : error.message}`);
    else setMsg('✅ Palpite master salvo!');
    setSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  const homeTeamObj = teams.find((t) => t.id === homeTeam);
  const awayTeamObj = teams.find((t) => t.id === awayTeam);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">🔮 Palpite Master</h1>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <p className="text-sm text-gray-300 mb-1">
          Quem estará na <strong>grande final</strong> da Copa 2026? Qual será o placar?
        </p>
        <p className="text-xs text-gray-500 mb-4">
          🏆 25 pts pelos finalistas corretos + 30 pts pelo placar exato da final (máx 55 pts).<br />
          🔒 Seu palpite é <strong>secreto</strong> — só você e o admin podem vê-lo até o dia da final.
        </p>

        <div className="bg-gray-800 rounded-lg px-4 py-2 mb-4 text-sm text-gray-400">
          {count} de {memberCount} participantes já fizeram o palpite master
        </div>

        {isLocked && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-sm text-red-300">
            🔒 A final já começou. O palpite master está travado.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time campeão</label>
              <select
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                disabled={isLocked}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white disabled:opacity-50 focus:outline-none focus:border-green-500"
              >
                <option value="">Selecione...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name_en}</option>
                ))}
              </select>
              {homeTeamObj && (
                <p className="text-xs text-gray-500 mt-1">🇧🇷 {homeTeamObj.name_en}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time vice</label>
              <select
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                disabled={isLocked}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white disabled:opacity-50 focus:outline-none focus:border-green-500"
              >
                <option value="">Selecione...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name_en}</option>
                ))}
              </select>
              {awayTeamObj && (
                <p className="text-xs text-gray-500 mt-1">🇧🇷 {awayTeamObj.name_en}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Placar da final</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0" max="99"
                value={homeScore}
                onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                disabled={isLocked}
                required
                className="w-16 px-2 py-2 text-center bg-gray-800 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50 focus:outline-none focus:border-green-500"
              />
              <span className="text-gray-500">×</span>
              <input
                type="number"
                min="0" max="99"
                value={awayScore}
                onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                disabled={isLocked}
                required
                className="w-16 px-2 py-2 text-center bg-gray-800 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {!isLocked && (
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {saving ? 'Salvando...' : prediction ? 'Atualizar Palpite' : 'Registrar Palpite'}
            </button>
          )}

          {msg && (
            <p className={`text-sm ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {msg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

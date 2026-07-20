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

interface MasterWithProfile {
  id: number;
  user_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  profiles: { name: string };
}

export function MasterPredictionPage() {
  const { activeBolao } = useApp();
  const { prediction, count, loading, savePrediction } = useMasterPrediction();
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeamMap, setAllTeamMap] = useState<Map<string, Team>>(new Map());
  const [homeTeam, setHomeTeam] = useState(prediction?.home_team_id || '');
  const [awayTeam, setAwayTeam] = useState(prediction?.away_team_id || '');
  const [homeScore, setHomeScore] = useState(prediction?.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(prediction?.away_score?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [memberCount, setMemberCount] = useState<number>(0);
  const [finalFinished, setFinalFinished] = useState(false);
  const [allMasters, setAllMasters] = useState<MasterWithProfile[]>([]);

  const deadline = new Date('2026-07-09T02:59:59Z');
  const isLocked = new Date() > deadline;

  useEffect(() => {
    // Check if final is finished
    supabase.from('matches').select('finished').eq('group_name', 'FINAL').single().then(({ data }) => {
      if (data?.finished) setFinalFinished(true);
    });

    // Load all teams for name resolution
    supabase.from('teams').select('id, name_en, flag_url').order('name_en').then(({ data }) => {
      if (data) {
        const map = new Map<string, Team>();
        data.forEach((t) => map.set(t.id, t));
        setAllTeamMap(map);

        // Filter to knockout teams
        supabase.from('matches').select('home_team_id, away_team_id').eq('stage', 'knockout').then(({ data: koMatches }) => {
          if (koMatches) {
            const koIds = new Set<string>();
            koMatches.forEach((m) => {
              if (m.home_team_id && m.home_team_id !== '0') koIds.add(m.home_team_id);
              if (m.away_team_id && m.away_team_id !== '0') koIds.add(m.away_team_id);
            });
            setTeams(data.filter((t) => koIds.has(t.id)));
          }
        });
      }
    });

    // Count bolão members
    if (activeBolao) {
      supabase.from('bolao_members').select('*', { count: 'exact', head: true }).eq('bolao_id', activeBolao.id).then(({ count }) => {
        setMemberCount(count || 0);
      });
    }
  }, [activeBolao]);

  // Fetch all master predictions if final is finished
  useEffect(() => {
    if (finalFinished && activeBolao) {
      supabase
        .from('master_predictions')
        .select('*, profiles!inner(name)')
        .eq('bolao_id', activeBolao.id)
        .order('points', { ascending: false })
        .then(({ data }) => {
          if (data) setAllMasters(data as unknown as MasterWithProfile[]);
        });
    }
  }, [finalFinished, activeBolao]);

  useEffect(() => {
    if (prediction) {
      setHomeTeam(prediction.home_team_id);
      setAwayTeam(prediction.away_team_id);
      setHomeScore(prediction.home_score?.toString() ?? '');
      setAwayScore(prediction.away_score?.toString() ?? '');
    }
  }, [prediction]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      setMsg('Selecione dois times diferentes.');
      return;
    }
    const h = parseInt(homeScore) || 0;
    const a = parseInt(awayScore) || 0;
    setSaving(true);
    setMsg('');
    const { error } = await savePrediction({ home_team_id: homeTeam, away_team_id: awayTeam, home_score: h, away_score: a });
    if (error) setMsg(`Erro: ${typeof error === 'string' ? error : error.message}`);
    else setMsg('✅ Palpite master salvo!');
    setSaving(false);
  }

  function getTeamFlag(teamId: string) {
    return allTeamMap.get(teamId)?.flag_url;
  }

  function getTeamName(teamId: string) {
    return allTeamMap.get(teamId)?.name_en || teamId;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">🔮 Palpite Master</h1>

      {/* Personal prediction form */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <p className="text-sm text-gray-300 mb-1">
          Quem estará na <strong>grande final</strong> da Copa 2026? Qual será o placar?
        </p>
        <p className="text-xs text-gray-500 mb-4">
          🏆 25 pts pelos finalistas corretos (ordem não importa) + 30 pts pelo placar exato (máx 55 pts).<br />
          🔒 Seu palpite é <strong>secreto</strong> — só você e o admin podem vê-lo até o dia da final.
        </p>

        <div className="bg-gray-800 rounded-lg px-4 py-2 mb-4 text-sm text-gray-400">
          {count} de {memberCount} participantes já fizeram o palpite master
        </div>

        {isLocked && !finalFinished && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-sm text-red-300">
            🔒 O prazo para o palpite master encerrou. Seu palpite está travado e será revelado no dia da final.
          </div>
        )}

        {finalFinished && prediction && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            (prediction.points || 0) > 0
              ? 'bg-green-900/20 border border-green-700/50 text-green-300'
              : 'bg-gray-800 border border-gray-700 text-gray-400'
          }`}>
            ✅ Palpite master revelado! Você fez <strong>{prediction.points || 0} pts</strong>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time campeão</label>
              <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} disabled={isLocked} required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white disabled:opacity-50 focus:outline-none focus:border-green-500">
                <option value="">Selecione...</option>
                {teams.map((t) => (<option key={t.id} value={t.id}>{t.name_en}</option>))}
              </select>
              {homeTeam && (
                <div className="flex items-center gap-1 mt-1">
                  <img src={getTeamFlag(homeTeam)} alt="" className="w-5 h-3 rounded" />
                  <span className="text-xs text-gray-400">{getTeamName(homeTeam)}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time vice-campeão</label>
              <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} disabled={isLocked} required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white disabled:opacity-50 focus:outline-none focus:border-green-500">
                <option value="">Selecione...</option>
                {teams.map((t) => (<option key={t.id} value={t.id}>{t.name_en}</option>))}
              </select>
              {awayTeam && (
                <div className="flex items-center gap-1 mt-1">
                  <img src={getTeamFlag(awayTeam)} alt="" className="w-5 h-3 rounded" />
                  <span className="text-xs text-gray-400">{getTeamName(awayTeam)}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Placar da final (campeão × vice)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="99" value={homeScore}
                onChange={(e) => setHomeScore(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                disabled={isLocked} required
                className="w-16 px-2 py-2 text-center bg-gray-800 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50 focus:outline-none focus:border-green-500" />
              <span className="text-gray-500">×</span>
              <input type="number" min="0" max="99" value={awayScore}
                onChange={(e) => setAwayScore(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                disabled={isLocked} required
                className="w-16 px-2 py-2 text-center bg-gray-800 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50 focus:outline-none focus:border-green-500" />
            </div>
          </div>

          {!isLocked && (
            <button type="submit" disabled={saving}
              className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold rounded-lg transition">
              {saving ? 'Salvando...' : prediction ? 'Atualizar Palpite' : 'Registrar Palpite'}
            </button>
          )}

          {msg && (
            <p className={`text-sm ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
          )}
        </form>
      </div>

      {/* All master predictions (revealed after final) */}
      {finalFinished && allMasters.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">🔓 Palpites Master Revelados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="py-2 px-2 text-left">Participante</th>
                  <th className="py-2 px-2 text-center">Campeão</th>
                  <th className="py-2 px-2 text-center">Vice</th>
                  <th className="py-2 px-2 text-center">Placar</th>
                  <th className="py-2 px-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {allMasters.map((mp) => (
                  <tr key={mp.id} className="border-b border-gray-800/50">
                    <td className="py-2 px-2 font-medium">{mp.profiles?.name}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <img src={getTeamFlag(mp.home_team_id)} alt="" className="w-4 h-3 rounded" />
                        <span className="text-xs">{getTeamName(mp.home_team_id)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <img src={getTeamFlag(mp.away_team_id)} alt="" className="w-4 h-3 rounded" />
                        <span className="text-xs">{getTeamName(mp.away_team_id)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">{mp.home_score} × {mp.away_score}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`font-bold ${(mp.points || 0) > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                        {mp.points || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useMatches, useMatchGroups, useGroupStageComplete } from '../hooks/useMatches';
import { usePredictions } from '../hooks/usePredictions';
import { useAllPredictions, type PredictionWithName } from '../hooks/useAllPredictions';
import { MatchCard } from '../components/MatchCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTeams } from '../hooks/useTeams';
import { useStadiums } from '../hooks/useStadiums';
import { useTeamHistory } from '../hooks/useTeamHistory';
import { useGlobalOdds } from '../hooks/useGlobalOdds';
import { useApp } from '../contexts/AuthContext';
import type { CompetitionSlug, Prediction, Match } from '../types';

export function HomePage() {
  const [stage, setStage] = useState<CompetitionSlug>('group');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [matchdayFilter, setMatchdayFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'finished'>('all');

  const { matches, loading, error } = useMatches(stage);
  const { groups, loading: groupsLoading } = useMatchGroups();
  const { allFinished: groupStageDone, loading: checkingGroupStage } = useGroupStageComplete();
  const { predictions, savePrediction } = usePredictions();
  const [savingId, setSavingId] = useState<number | null>(null);
  const { activeBolao } = useApp();

  const predictionMap = useMemo(() => {
    const map = new Map<number, Prediction>();
    predictions.forEach((p) => map.set(p.match_id, p));
    return map;
  }, [predictions]);

  const matchdays = useMemo(() => {
    if (stage === 'group') {
      const days = [...new Set(matches.map((m) => m.matchday))].sort((a, b) => a - b);
      return days;
    }
    return [];
  }, [matches, stage]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (stage === 'group') {
        if (groupFilter !== 'all' && m.group_name !== groupFilter) return false;
        if (matchdayFilter !== 'all' && m.matchday !== parseInt(matchdayFilter)) return false;
      }
      if (statusFilter === 'finished' && !m.finished) return false;
      if (statusFilter === 'upcoming' && m.finished) return false;
      return true;
    });
  }, [matches, stage, groupFilter, matchdayFilter, statusFilter]);

  // Todos os palpites (de todos os usuários) para os jogos filtrados
  // Count today's upcoming games without prediction
  const todayMissed = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    return filtered.filter((m) => {
      if (m.finished) return false;
      const d = new Date(m.match_date);
      return d > now && d <= todayEnd && !predictionMap.has(m.id);
    }).length;
  }, [filtered, predictionMap]);

  const filteredMatchIds = useMemo(() => filtered.map((m) => m.id), [filtered]);
  const { predictions: allPredictions } = useAllPredictions(filteredMatchIds, activeBolao?.id);
  const { teamMap } = useTeams();
  const { stadiumMap } = useStadiums();
  const { historyMap } = useTeamHistory();
  const { oddsMap } = useGlobalOdds(filteredMatchIds);

  // Agrupa palpites por match_id
  const allPredictionsByMatch = useMemo(() => {
    const map = new Map<number, PredictionWithName[]>();
    allPredictions.forEach((p) => {
      const list = map.get(p.match_id) || [];
      list.push(p);
      map.set(p.match_id, list);
    });
    return map;
  }, [allPredictions]);

  // Split into live, upcoming, and finished. Group each by date (Brasília time).
  const { liveGroups, upcomingGroups, finishedGroups } = useMemo(() => {
    const now = new Date();
    const live: Match[] = [];
    const upcoming: Match[] = [];
    const finished: Match[] = [];

    for (const match of filtered) {
      if (match.finished) {
        finished.push(match);
      } else if (new Date(match.match_date) <= now) {
        live.push(match);
      } else {
        upcoming.push(match);
      }
    }

    function groupByDate(matches: Match[]) {
      const groups: { date: string; matches: Match[] }[] = [];
      const seen = new Map<string, number>();

      for (const match of matches) {
        const utcDate = new Date(match.match_date);
        const matchBrasilia = new Date(
          utcDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
        );

        if (matchBrasilia.getHours() < 6) {
          matchBrasilia.setDate(matchBrasilia.getDate() - 1);
        }

        const dateKey = matchBrasilia.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        if (seen.has(dateKey)) {
          groups[seen.get(dateKey)!].matches.push(match);
        } else {
          seen.set(dateKey, groups.length);
          groups.push({ date: dateKey, matches: [match] });
        }
      }
      return groups;
    }

    return {
      liveGroups: groupByDate(live),
      upcomingGroups: groupByDate(upcoming),
      finishedGroups: groupByDate(finished),
    };
  }, [filtered]);

  async function handlePredict(matchId: number, home_score: number, away_score: number) {
    setSavingId(matchId);
    await savePrediction(matchId, home_score, away_score);
    setSavingId(null);
  }

  const knockoutStages = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'];
  const stageLabel = stage === 'group' ? 'Fase de Grupos' : 'Mata-mata';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{stageLabel}</h1>
        <div className="flex bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => { setStage('group'); setGroupFilter('all'); setMatchdayFilter('all'); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              stage === 'group' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Grupos
          </button>
          <button
            onClick={() => { setStage('knockout'); setGroupFilter('all'); setMatchdayFilter('all'); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              stage === 'knockout' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Mata-mata
          </button>
        </div>
      </div>

      {/* Filters */}
      {stage === 'group' && !groupsLoading && (
        <div className="flex flex-wrap gap-2 mb-6">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">Todos os Grupos</option>
            {groups.map((g) => (
              <option key={g} value={g}>Grupo {g}</option>
            ))}
          </select>

          <select
            value={matchdayFilter}
            onChange={(e) => setMatchdayFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">Todas as Rodadas</option>
            {matchdays.map((d) => (
              <option key={d} value={d}>Rodada {d}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'upcoming' | 'finished')}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">Todos os status</option>
            <option value="upcoming">A definir / Em andamento</option>
            <option value="finished">Encerrados</option>
          </select>
        </div>
      )}

      {stage === 'knockout' && (
        <div className="flex flex-wrap gap-2 mb-6">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">Todas as Fases</option>
            {knockoutStages.map((s) => (
              <option key={s} value={s}>{s === '3RD' ? '3º Lugar' : s}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'upcoming' | 'finished')}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">Todos os status</option>
            <option value="upcoming">A definir / Em andamento</option>
            <option value="finished">Encerrados</option>
          </select>
        </div>
      )}

      {!loading && (todayMissed > 0 ? (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-center gap-2">
          <span className="text-yellow-400">⚠️</span>
          <p className="text-sm text-yellow-300">
            Você ainda não palpitou em{' '}
            <strong>{todayMissed}</strong>{' '}
            {todayMissed === 1 ? 'jogo' : 'jogos'} de hoje!
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg flex items-center gap-2">
          <span className="text-green-400">✅</span>
          <p className="text-sm text-green-300">
            {filtered.filter(m => !m.finished).length === 0
              ? 'Nenhum jogo pendente para hoje.'
              : 'Todos os jogos de hoje foram palpitados!'}
          </p>
        </div>
      ))}

      {loading && <LoadingSpinner />}
      {error && <p className="text-red-400 text-center py-8">{error}</p>}

      {!loading && !error && stage === 'knockout' && !checkingGroupStage && !groupStageDone && (
        <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-yellow-800">
          <p className="text-yellow-400 text-lg font-semibold mb-2">🔒 Mata-mata indisponível</p>
          <p className="text-gray-400 text-sm">
            Os palpites do mata-mata serão liberados após o término de todos os jogos da fase de grupos.
          </p>
        </div>
      )}

      {!loading && !error && (stage === 'group' || !checkingGroupStage) && (stage === 'group' || groupStageDone) && (
        <div className="space-y-8">
          {/* LIVE GAMES */}
          {liveGroups.map((group) => (
            <div key={'live-' + group.date}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                {group.date}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predictionMap.get(match.id) || null}
                    allPredictions={allPredictionsByMatch.get(match.id) || []}
                    homeFlag={teamMap.get(match.home_team_id)}
                    awayFlag={teamMap.get(match.away_team_id)}
                    stadiumName={stadiumMap.get(match.stadium)}
                    homeForm={historyMap.get(match.home_team_id)}
                    awayForm={historyMap.get(match.away_team_id)}
                    globalOdds={oddsMap.get(match.id) || null}
                    onPredict={(h, a) => handlePredict(match.id, h, a)}
                    saving={savingId === match.id}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* UPCOMING GAMES */}
          {upcomingGroups.map((group) => (
            <div key={'up-' + group.date}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {group.date}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predictionMap.get(match.id) || null}
                    allPredictions={allPredictionsByMatch.get(match.id) || []}
                    homeFlag={teamMap.get(match.home_team_id)}
                    awayFlag={teamMap.get(match.away_team_id)}
                    stadiumName={stadiumMap.get(match.stadium)}
                    onPredict={(h, a) => handlePredict(match.id, h, a)}
                    saving={savingId === match.id}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Divider + FINISHED GAMES */}
          {finishedGroups.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2">
                <hr className="flex-1 border-gray-800" />
                <span className="text-xs text-gray-600 font-medium uppercase">Jogos encerrados</span>
                <hr className="flex-1 border-gray-800" />
              </div>
              {finishedGroups.map((group) => (
                <div key={'fin-' + group.date}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    {group.date}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.matches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        prediction={predictionMap.get(match.id) || null}
                        allPredictions={allPredictionsByMatch.get(match.id) || []}
                        homeFlag={teamMap.get(match.home_team_id)}
                        awayFlag={teamMap.get(match.away_team_id)}
                        stadiumName={stadiumMap.get(match.stadium)}
                        homeForm={historyMap.get(match.home_team_id)}
                        awayForm={historyMap.get(match.away_team_id)}
                        globalOdds={oddsMap.get(match.id) || null}
                        onPredict={(h, a) => handlePredict(match.id, h, a)}
                        saving={savingId === match.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Nenhum jogo encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

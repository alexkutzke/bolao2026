import { useState, useMemo } from 'react';
import { usePredictions } from '../hooks/usePredictions';
import { useMatches, useGroupStageComplete } from '../hooks/useMatches';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { CompetitionSlug } from '../types';

export function MyPredictionsPage() {
  const [stage, setStage] = useState<CompetitionSlug>('knockout');
  const { predictions, loading: predLoading, savePrediction } = usePredictions();
  const { matches, loading: matchLoading } = useMatches(stage);
  const { allFinished: groupStageDone } = useGroupStageComplete();
  const [savingId, setSavingId] = useState<number | null>(null);

  const matchMap = useMemo(() => {
    const map = new Map();
    matches.forEach((m) => map.set(m.id, m));
    return map;
  }, [matches]);

  // Matches that user already predicted, filtered by stage, sorted by date
  const predictedMatches = useMemo(() => {
    return predictions
      .map((p) => {
        const match = matchMap.get(p.match_id);
        return { prediction: p, match };
      })
      .filter(({ match }) => match && match.stage === stage)
      .sort(
        (a, b) =>
          new Date(a.match!.match_date).getTime() -
          new Date(b.match!.match_date).getTime(),
      );
  }, [predictions, matchMap, stage]);

  async function handlePredict(matchId: number, home_score: number, away_score: number) {
    setSavingId(matchId);
    await savePrediction(matchId, home_score, away_score);
    setSavingId(null);
  }

  const stageLabel = stage === 'group' ? 'Fase de Grupos' : 'Mata-mata';
  const loading = predLoading || matchLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Meus Palpites</h1>
        <div className="flex bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setStage('group')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              stage === 'group' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Grupos
          </button>
          <button
            onClick={() => setStage('knockout')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              stage === 'knockout' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Mata-mata
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && predictedMatches.length === 0 && (stage === 'group' || groupStageDone) && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Nenhum palpite registrado na {stageLabel}.</p>
          <p className="text-gray-600 text-sm mt-1">
            Vá para a página de Jogos para registrar seus palpites.
          </p>
        </div>
      )}

      {!loading && stage === 'knockout' && !groupStageDone && (
        <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-yellow-800">
          <p className="text-yellow-400 text-lg font-semibold mb-2">🔒 Mata-mata indisponível</p>
          <p className="text-gray-400 text-sm">
            Os palpites do mata-mata serão liberados após o término de todos os jogos da fase de grupos.
          </p>
        </div>
      )}

      {!loading && (stage === 'group' || groupStageDone) && (
        <div className="space-y-3">
          {predictedMatches.map(({ prediction, match }) => {
            if (!match) return null;
            const matchDate = new Date(match.match_date);
            const isPast = matchDate < new Date();
            const canEdit = !isPast && !match.finished && (match.stage === 'group' || groupStageDone);

            return (
              <div
                key={prediction.id}
                className={`rounded-xl border p-4 flex items-center justify-between ${
                  match.finished
                    ? 'border-green-800 bg-gray-900/50'
                    : 'border-gray-700 bg-gray-900/50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {match.group_name}
                    </span>
                    <span className="text-sm font-medium">
                      {match.home_team_label || match.home_team_name}
                    </span>
                    <span className="text-xs text-gray-600">vs</span>
                    <span className="text-sm font-medium">
                      {match.away_team_label || match.away_team_name}
                    </span>
                    {match.finished && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 font-medium">
                        Finalizado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {matchDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {match.finished && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Resultado</p>
                      <p className="text-sm font-bold tabular-nums">
                        {match.home_score} × {match.away_score}
                      </p>
                    </div>
                  )}

                  <div className="text-right">
                    <p className="text-xs text-gray-500">Seu palpite</p>
                    {canEdit ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const h = parseInt(
                            (form.elements.namedItem('home') as HTMLInputElement).value,
                          );
                          const a = parseInt(
                            (form.elements.namedItem('away') as HTMLInputElement).value,
                          );
                          if (!isNaN(h) && !isNaN(a)) handlePredict(match.id, h, a);
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          name="home"
                          type="number"
                          min="0"
                          max="99"
                          defaultValue={prediction.home_score}
                          className="w-10 px-1 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <span className="text-gray-600 text-xs">×</span>
                        <input
                          name="away"
                          type="number"
                          min="0"
                          max="99"
                          defaultValue={prediction.away_score}
                          className="w-10 px-1 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <button
                          type="submit"
                          disabled={savingId === match.id}
                          className="text-xs text-green-400 hover:text-green-300 ml-1"
                        >
                          {savingId === match.id ? '...' : 'Salvar'}
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm font-bold tabular-nums">
                          {prediction.home_score} × {prediction.away_score}
                        </p>
                        {prediction.points !== null && (
                          <p
                            className={`text-xs font-medium ${
                              prediction.points > 0
                                ? 'text-green-400'
                                : 'text-gray-600'
                            }`}
                          >
                            {prediction.points} pts
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { CompetitionSlug } from '../types';

export function LeaderboardPage() {
  const [stage, setStage] = useState<CompetitionSlug>('group');
  const { entries, loading } = useLeaderboard(stage);

  const stageLabel = stage === 'group' ? 'Fase de Grupos' : 'Mata-mata';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🏆 Quadro de Pontos</h1>
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

      {!loading && entries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Nenhum ponto calculado ainda na {stageLabel}.</p>
          <p className="text-gray-600 text-sm mt-1">
            Aguarde o admin calcular os pontos após os jogos terminarem.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto">
          {/* Critérios de pontuação */}
          <div className="bg-gray-900/70 rounded-xl border border-gray-800 p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📋 Como funciona a pontuação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/20 border border-green-800/50">
                <span className="text-lg font-bold text-green-400 shrink-0">10</span>
                <div>
                  <p className="text-sm font-medium text-green-300">Placar exato</p>
                  <p className="text-xs text-gray-400">Acertar o placar exato do jogo. Ex: palpite 2×1, resultado 2×1.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/15 border border-green-800/30">
                <span className="text-lg font-bold text-green-300 shrink-0">7</span>
                <div>
                  <p className="text-sm font-medium text-green-300">Vencedor + diferença de gols</p>
                  <p className="text-xs text-gray-400">Acertar quem ganhou <strong>e</strong> a diferença de gols. Ex: palpite 3×1, resultado 2×0 (diferença de 2 gols).</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/10 border border-green-800/20">
                <span className="text-lg font-bold text-green-200 shrink-0">4</span>
                <div>
                  <p className="text-sm font-medium text-green-200">Vencedor ou empate</p>
                  <p className="text-xs text-gray-400">Acertar apenas quem ganhou, ou acertar que foi empate. Ex: palpite 1×0, resultado 3×1.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/5 border border-green-800/10">
                <span className="text-lg font-bold text-green-100 shrink-0">2</span>
                <div>
                  <p className="text-sm font-medium text-green-100">Gols de um time</p>
                  <p className="text-xs text-gray-400">Acertar o número exato de gols de um dos times. Ex: palpite 2×1, resultado 2×0 (acertou 2 gols do time A).</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ⚠️ Apenas a <strong>maior pontuação</strong> é atribuída por jogo — as categorias não acumulam.
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-2 text-left w-10">#</th>
                <th className="py-3 px-2 text-left">Nome</th>
                <th className="py-3 px-2 text-center">Pts</th>
                <th className="py-3 px-2 text-center">Exato</th>
                <th className="py-3 px-2 text-center">V+D</th>
                <th className="py-3 px-2 text-center">Venc</th>
                <th className="py-3 px-2 text-center">Gols</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.user_id}
                  className={`border-b border-gray-800/50 hover:bg-gray-900/50 transition ${
                    index < 3 ? 'font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-gray-900'
                          : index === 1
                            ? 'bg-gray-300 text-gray-900'
                            : index === 2
                              ? 'bg-amber-700 text-white'
                              : 'text-gray-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-2">{entry.name}</td>
                  <td className="py-3 px-2 text-center text-green-400 font-bold text-base">
                    {entry.total_points}
                  </td>
                  <td className="py-3 px-2 text-center">{entry.exact_scores}</td>
                  <td className="py-3 px-2 text-center">{entry.winner_diff}</td>
                  <td className="py-3 px-2 text-center">{entry.winners}</td>
                  <td className="py-3 px-2 text-center">{entry.one_team_goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

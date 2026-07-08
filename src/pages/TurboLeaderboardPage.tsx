import { useApp } from '../contexts/AuthContext';
import { useTurboLeaderboard } from '../hooks/useTurboLeaderboard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function TurboLeaderboardPage() {
  const { activeBolao, user } = useApp();
  const { entries, loading } = useTurboLeaderboard(activeBolao?.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">⚡ Bolão Turbo</h1>
        <p className="text-xs text-gray-500 mt-1">
          Quanto pior sua posição, maior o multiplicador.
          Atualizado a cada jogo do mata-mata.
        </p>
      </div>

      <div className="bg-gray-900/70 rounded-xl border border-gray-800 p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">1º</span><span className="text-white font-medium">×1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">2º-3º</span><span className="text-white font-medium">×1.2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">4º-6º</span><span className="text-white font-medium">×1.5</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">7º+</span><span className="text-white font-medium">×2.0</span>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && entries.length === 0 && (
        <p className="text-gray-500 text-center py-8">Nenhum ponto calculado ainda.</p>
      )}

      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-2 text-left w-10">#</th>
                <th className="py-3 px-2 text-left">Nome</th>
                <th className="py-3 px-2 text-center">Pts</th>
                <th className="py-3 px-2 text-center">Multiplicador</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.user_id}
                  className={`border-b transition ${
                    entry.user_id === user?.id
                      ? 'bg-green-900/30 border-green-800/50'
                      : 'border-gray-800/50 hover:bg-gray-900/50'
                  }`}
                >
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-gray-900' :
                      index === 1 ? 'bg-gray-300 text-gray-900' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-2">{entry.name}</td>
                  <td className="py-3 px-2 text-center text-green-400 font-bold text-base">
                    {entry.total_points}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      entry.turbo_multiplier >= 2.0 ? 'bg-purple-900/50 text-purple-400' :
                      entry.turbo_multiplier >= 1.5 ? 'bg-blue-900/50 text-blue-400' :
                      entry.turbo_multiplier >= 1.2 ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      ×{entry.turbo_multiplier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

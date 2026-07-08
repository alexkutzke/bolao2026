import { useState, useMemo } from 'react';
import { computeOdds } from '../lib/odds';

interface MatchCardProps {
  match: {
    id: number;
    api_id: number;
    home_team_name: string;
    away_team_name: string;
    home_score: number | null;
    away_score: number | null;
    group_name: string;
    matchday: number;
    match_date: string;
    stadium: string;
    finished: boolean;
    stage: 'group' | 'knockout';
    home_team_label?: string | null;
    away_team_label?: string | null;
  };
  prediction?: {
    home_score: number;
    away_score: number;
  } | null;
  onPredict?: (home: number, away: number) => void;
  saving?: boolean;
  allPredictions?: Array<{
    user_id: string;
    home_score: number;
    away_score: number;
    points: number | null;
    profiles: { name: string } | null;
  }>;
  homeFlag?: string;
  awayFlag?: string;
  stadiumName?: string;
  homeForm?: { last5: ('W' | 'D' | 'L')[]; goalsFor: number; goalsAgainst: number };
  awayForm?: { last5: ('W' | 'D' | 'L')[]; goalsFor: number; goalsAgainst: number };
  globalOdds?: { total: number; home_win_pct: number; draw_pct: number; away_win_pct: number; most_common_score: string | null; avg_home_goals: number; avg_away_goals: number } | null;
}

export function MatchCard({ match, prediction, allPredictions, homeFlag, awayFlag, stadiumName, homeForm, awayForm, globalOdds, onPredict, saving }: MatchCardProps) {
  const [editing, setEditing] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const odds = useMemo(() => {
    // Prefer global odds (from RPC, includes all bolões)
    if (globalOdds) {
      return {
        total: globalOdds.total,
        homeWinPct: globalOdds.home_win_pct,
        drawPct: globalOdds.draw_pct,
        awayWinPct: globalOdds.away_win_pct,
        mostCommonScore: globalOdds.most_common_score,
        avgHomeGoals: globalOdds.avg_home_goals,
        avgAwayGoals: globalOdds.avg_away_goals,
      };
    }
    // Fallback to local computation (only current bolão)
    return computeOdds(allPredictions || []);
  }, [globalOdds, allPredictions]);
  const matchDate = new Date(match.match_date);
  const now = new Date();
  const isPast = matchDate <= now;
  const canPredict = !isPast && !match.finished && !!onPredict;

  const stageLabel =
    match.stage === 'group'
      ? `Grupo ${match.group_name} · Rodada ${match.matchday}`
      : match.group_name;

  const needsPrediction = !isPast && !match.finished && !prediction && !!onPredict;

  // Visual state
  const cardClass = match.finished
    ? 'border-gray-700/50 bg-gray-900/20 opacity-60'
    : isPast
      ? 'border-gray-700 bg-gray-900/40'
      : needsPrediction
        ? 'border-yellow-600/60 bg-yellow-900/10 ring-1 ring-yellow-600/30 hover:border-yellow-500 hover:bg-yellow-900/20'
        : 'border-gray-700 bg-gray-900/60 hover:border-green-700 hover:bg-gray-900/80';

  return (
    <div className={`rounded-xl border p-4 transition ${cardClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {stageLabel}
        </span>
        {match.finished && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 font-medium">
            Finalizado
          </span>
        )}
        {isPast && !match.finished && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 font-medium">
            Em andamento
          </span>
        )}
        {!isPast && !match.finished && !!onPredict && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400 font-medium">
            {prediction ? 'Palpitado' : 'Palpitar'}
          </span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center min-w-0">
          {homeFlag && (
            <img src={homeFlag} alt="" className="w-8 h-5 mx-auto mb-1 rounded shadow-sm object-cover" />
          )}
          <p className="text-sm font-semibold truncate">
            {match.home_team_label || match.home_team_name}
          </p>
          {homeForm && <FormDots form={homeForm.last5} />}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {match.finished ? (
            <span className="text-xl font-bold tabular-nums text-white">
              {match.home_score} <span className="text-gray-600">-</span> {match.away_score}
            </span>
          ) : (
            <span className="text-base text-gray-500 font-bold">vs</span>
          )}
        </div>

        <div className="flex-1 text-center min-w-0">
          {awayFlag && (
            <img src={awayFlag} alt="" className="w-8 h-5 mx-auto mb-1 rounded shadow-sm object-cover" />
          )}
          <p className="text-sm font-semibold truncate">
            {match.away_team_label || match.away_team_name}
          </p>
          {awayForm && <FormDots form={awayForm.last5} />}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
        <span>🏟 {stadiumName || match.stadium}</span>
      </div>

      {/* Prediction Section — Finished match: show result + user prediction */}
      {match.finished && prediction && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Seu palpite:{' '}
              <span className="text-gray-300 font-medium">
                {prediction.home_score} × {prediction.away_score}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Prediction Section — Finished match, no prediction */}
      {match.finished && !prediction && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <p className="text-xs text-gray-600 italic">Você não palpitou neste jogo</p>
        </div>
      )}

      {/* Prediction Section — Past but not finished */}
      {isPast && !match.finished && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          {prediction ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Palpite:{' '}
                <span className="text-yellow-400 font-medium">
                  {prediction.home_score} × {prediction.away_score}
                </span>
              </p>
              <span className="text-xs text-yellow-600">Aguardando resultado</span>
            </div>
          ) : (
            <p className="text-xs text-red-400">Prazo encerrado — palpite não registrado</p>
          )}
        </div>
      )}

      {/* Prediction Section — Future match with prediction */}
      {!isPast && !match.finished && prediction && !editing && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Seu palpite:{' '}
              <span className="text-green-400 font-medium">
                {prediction.home_score} × {prediction.away_score}
              </span>
            </p>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-yellow-400 hover:text-yellow-300 transition"
            >
              Editar
            </button>
          </div>
        </div>
      )}

      {/* Prediction Section — Future match editing */}
      {!isPast && !match.finished && editing && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <PredictionInput
            onSubmit={(h, a) => { onPredict!(h, a); setEditing(false); }}
            saving={saving}
            initialHome={prediction?.home_score}
            initialAway={prediction?.away_score}
          />
        </div>
      )}

      {/* Prediction Section — Future match without prediction */}
      {canPredict && !prediction && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <PredictionInput onSubmit={(h, a) => onPredict!(h, a)} saving={saving} />
        </div>
      )}

      {/* Prediction Section — Future match, cannot predict (knockout without teams defined) */}
      {!isPast && !match.finished && !onPredict && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 italic">Times a definir</p>
        </div>
      )}

      {/* Palpites de todos os participantes */}
      {allPredictions && allPredictions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition"
          >
            <span>
              Palpites registrados{' '}
              <span className="text-gray-400">({allPredictions.length})</span>
            </span>
            <span className="transition-transform" style={{ transform: showPredictions ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
          {showPredictions && (
          <div className="space-y-1 mt-2">
            {[...allPredictions]
              .sort((a, b) => (a.profiles?.name || '').localeCompare(b.profiles?.name || ''))
              .map((p: { user_id: string; home_score: number; away_score: number; points: number | null; profiles: { name: string } | null }) => (
              <div key={p.user_id} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 truncate max-w-[100px]">
                  {p.profiles?.name || 'Anônimo'}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums text-gray-300">
                    {p.home_score} × {p.away_score}
                  </span>
                  {match.finished && p.points !== null && (
                    <span className={`font-bold tabular-nums ${
                      p.points > 0 ? 'text-green-400' : 'text-gray-600'
                    }`}>
                      {p.points}p
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Odds (expectativa do bolão) */}
      {odds && odds.total >= 2 && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <p className="text-xs text-gray-600 mb-2">Expectativa do bolão ({odds.total} palpites)</p>
          <div className="space-y-1.5">
            <Bar label="Casa" pct={odds.homeWinPct} color="bg-green-600" />
            <Bar label="Empate" pct={odds.drawPct} color="bg-gray-500" />
            <Bar label="Fora" pct={odds.awayWinPct} color="bg-blue-600" />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            {odds.mostCommonScore && (
              <span>Mais comum: <span className="text-gray-300">{odds.mostCommonScore}</span></span>
            )}
            <span>Média de gols: {odds.avgHomeGoals} × {odds.avgAwayGoals}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PredictionInput({
  onSubmit,
  saving,
  initialHome,
  initialAway,
}: {
  onSubmit: (home: number, away: number) => void;
  saving?: boolean;
  initialHome?: number;
  initialAway?: number;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const home = parseInt((form.elements.namedItem('home') as HTMLInputElement).value);
    const away = parseInt((form.elements.namedItem('away') as HTMLInputElement).value);
    if (!isNaN(home) && !isNaN(away) && home >= 0 && away >= 0) {
      onSubmit(home, away);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        name="home"
        type="number"
        min="0"
        max="99"
        placeholder="0"
        defaultValue={initialHome}
        required
        className="w-14 px-2 py-1.5 text-center bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
      />
      <span className="text-gray-600 text-sm">×</span>
      <input
        name="away"
        type="number"
        min="0"
        max="99"
        placeholder="0"
        defaultValue={initialAway}
        required
        className="w-14 px-2 py-1.5 text-center bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
      />
      <button
        type="submit"
        disabled={saving}
        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition"
      >
        {saving ? '...' : '💾'}
      </button>
    </form>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-400 tabular-nums">{pct}%</span>
    </div>
  );
}

function FormDots({ form }: { form: ('W' | 'D' | 'L')[] }) {
  return (
    <div className="flex justify-center gap-0.5 mt-0.5">
      {form.map((r, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            r === 'W' ? 'bg-green-500' : r === 'D' ? 'bg-gray-500' : 'bg-red-500'
          }`}
          title={r === 'W' ? 'Vitória' : r === 'D' ? 'Empate' : 'Derrota'}
        />
      ))}
    </div>
  );
}

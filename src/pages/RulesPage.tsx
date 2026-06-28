export function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">📋 Regras do Bolão</h1>

      {/* Funcionamento geral */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">🏆 Funcionamento</h2>
        <p className="text-sm text-gray-300">
          O bolão é dividido em <strong>duas premiações independentes</strong>:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
          <li><strong>Fase de Grupos:</strong> 72 jogos da primeira fase (grupos A ao L).</li>
          <li><strong>Mata-mata:</strong> 32 jogos eliminatórios (oitavas, quartas, semi, 3º lugar e final).</li>
        </ul>
        <p className="text-sm text-gray-400">
          As pontuações <strong>não se misturam</strong> — cada fase tem seu próprio quadro de pontos
          e seu próprio vencedor.
        </p>
      </section>

      {/* Sistema de pontuação */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">🎯 Pontuação por jogo</h2>
        <p className="text-sm text-gray-400">
          Apenas a <strong>maior pontuação</strong> é atribuída por jogo — as categorias não acumulam.
        </p>
        <p className="text-sm text-gray-300">
          <strong>Fase de grupos:</strong> 10/7/4/2 pts &nbsp;|&nbsp; <strong>Mata-mata:</strong> 8/6/4/2 pts
        </p>

        <div className="space-y-3 mt-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/20 border border-green-800/50">
            <span className="text-xl font-bold text-green-400 shrink-0 w-8">10/8</span>
            <div>
              <p className="font-medium text-green-300">Placar exato</p>
              <p className="text-sm text-gray-400">
                Acertar o placar exato do jogo. (10 pts grupos, 8 pts mata-mata)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/15 border border-green-800/30">
            <span className="text-xl font-bold text-green-300 shrink-0 w-8">7/6</span>
            <div>
              <p className="font-medium text-green-300">Vencedor + diferença de gols</p>
              <p className="text-sm text-gray-400">
                Acertar quem ganhou <strong>e</strong> a diferença de gols (saldo). (7 pts grupos, 6 pts mata-mata)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/10 border border-green-800/20">
            <span className="text-xl font-bold text-green-200 shrink-0 w-8">4</span>
            <div>
              <p className="font-medium text-green-200">Vencedor ou empate</p>
              <p className="text-sm text-gray-400">
                Acertar apenas quem ganhou o jogo, ou acertar que foi empate.<br />
                <em>Ex: palpite 1×0, resultado real 3×1 — mesmo vencedor.</em>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/5 border border-green-800/10">
            <span className="text-xl font-bold text-green-100 shrink-0 w-8">2</span>
            <div>
              <p className="font-medium text-green-100">Gols de um time</p>
              <p className="text-sm text-gray-400">
                Acertar exatamente o número de gols de um dos times, quando nenhuma regra acima se aplica.<br />
                <em>Ex: palpite 2×1, resultado real 2×2 — acertou os 2 gols do time A, mas errou o vencedor.</em>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Regras de palpites */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">✏️ Palpites</h2>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
          <li>Os palpites podem ser registrados ou editados <strong>até o horário de início do jogo</strong> (horário de Brasília).</li>
          <li>Após o início do jogo, o palpite fica <strong>bloqueado</strong> e não pode mais ser alterado.</li>
          <li>Jogos <strong>finalizados</strong> aparecem desabilitados e exibem o resultado real e sua pontuação.</li>
          <li>Jogos que você não palpitou antes do prazo mostram a mensagem <strong>"Prazo encerrado"</strong> e não geram pontos.</li>
        </ul>
      </section>

      {/* Mata-mata */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">🔒 Mata-mata</h2>
        <p className="text-sm text-gray-300">
          Os palpites da fase de mata-mata <strong>só são liberados após o término de todos os jogos
          da fase de grupos</strong>. Isso evita que palpites sejam dados em jogos com times ainda
          indefinidos.
        </p>
        <p className="text-sm text-gray-400">
          Quando um jogo de mata-mata tem os times definidos (ex: "Vencedor Jogo 86 vs Vencedor Jogo 88"),
          os nomes reais dos times aparecerão assim que a sincronização for atualizada.
        </p>
      </section>

      {/* Atualização */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">🔄 Atualização de resultados</h2>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
          <li>Os resultados dos jogos são obtidos da <strong>API worldcup26.ir</strong>.</li>
          <li>O administrador pode sincronizar os jogos e calcular os pontos a qualquer momento pelo painel Admin.</li>
          <li>Se a API não estiver disponível ou o resultado estiver incorreto, o administrador pode <strong>lançar resultados manualmente</strong>.</li>
          <li>Resultados lançados manualmente <strong>não são sobrescritos</strong> pela sincronização automática.</li>
        </ul>
      </section>

      {/* Horários */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">🕐 Horários</h2>
        <p className="text-sm text-gray-300">
          Todos os horários exibidos estão no <strong>fuso de Brasília (GMT-3)</strong>.
        </p>
        <p className="text-sm text-gray-400">
          Jogos que começam de madrugada (antes das 6h da manhã no horário de Brasília) aparecem
          agrupados no dia anterior para facilitar a visualização.
        </p>
      </section>

      {/* Admin */}
      <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-green-400">👑 Administrador</h2>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
          <li>Apenas o administrador pode <strong>criar novos usuários</strong>.</li>
          <li>O administrador gerencia a sincronização de jogos e o cálculo de pontos.</li>
          <li>O administrador pode <strong>lançar ou corrigir resultados manualmente</strong>.</li>
          <li>O acesso é restrito a um grupo fechado de pessoas (família).</li>
        </ul>
      </section>
    </div>
  );
}

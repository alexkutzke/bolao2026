import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;

interface Match {
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  finished: boolean;
  group_name: string;
  stage: string;
  home_team_label: string | null;
  away_team_label: string | null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const bolaoId = url.searchParams.get('bolao_id');
  const headers = { 'Content-Type': 'application/json' };

  try {
    // Get today's matches (Brasília time window)
    const now = new Date();
    const brasiliaStart = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    brasiliaStart.setHours(0, 0, 0, 0);
    const startUtc = new Date(brasiliaStart.toLocaleString('en-US', { timeZone: 'UTC' }));

    const brasiliaEnd = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    brasiliaEnd.setHours(23, 59, 59, 999);
    const endUtc = new Date(brasiliaEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .gte('match_date', startUtc.toISOString())
      .lte('match_date', endUtc.toISOString())
      .order('match_date', { ascending: true });

    if (error) throw new Error(error.message);

    if (!matches || matches.length === 0) {
      await sendTelegram('📭 Nenhum jogo hoje.');
      return new Response(JSON.stringify({ success: true, matches: 0 }), { headers });
    }

    // Build message
    const dateStr = brasiliaStart.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });

    let msg = `⚽ *Jogos de ${dateStr}*\n\n`;

    for (const m of matches as Match[]) {
      const homeName = m.home_team_label || m.home_team_name;
      const awayName = m.away_team_label || m.away_team_name;
      const matchDate = new Date(m.match_date);
      const time = matchDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      if (m.finished && m.home_score !== null) {
        msg += `✅ ${homeName} *${m.home_score} × ${m.away_score}* ${awayName}\n`;
        msg += `   ${m.group_name} · ${time}\n\n`;
      } else {
        msg += `🕐 ${homeName} vs ${awayName}\n`;
        msg += `   ${m.group_name} · ${time}\n\n`;
      }
    }

    // Get leaderboard top 3 for knockout
    if (bolaoId) {
      // Specific bolão
      const { data: bolao } = await supabase.from('boloes').select('name').eq('id', bolaoId).single();
      if (bolao) {
        const top = await getTop3(bolaoId, bolao.name, 'knockout');
        if (top) msg += top;
      }
    } else {
      // All bolões
      for (const bolao of await getBoloes()) {
        const top = await getTop3(bolao.id, bolao.name, 'knockout');
        if (top) {
          msg += top;
          break;
        }
      }
    }

    await sendTelegram(msg);

    return new Response(JSON.stringify({ success: true, matches: matches.length }), { headers });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

async function sendTelegram(text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

async function getBoloes() {
  const { data } = await supabase.from('boloes').select('id, name');
  return data || [];
}

async function getTop3(bolaoId: string, bolaoName: string, stage: string) {
  const { data } = await supabase
    .from('predictions')
    .select('user_id, points, profiles!inner(name)')
    .eq('bolao_id', bolaoId)
    .eq('matches.stage', stage)
    .not('points', 'is', null);

  if (!data || data.length === 0) return null;

  const totals = new Map<string, { name: string; pts: number }>();
  for (const row of data) {
    const entry = totals.get(row.user_id) || {
      name: (row.profiles as unknown as { name: string }).name,
      pts: 0,
    };
    entry.pts += row.points;
    totals.set(row.user_id, entry);
  }

  const sorted = [...totals.values()].sort((a, b) => b.pts - a.pts).slice(0, 3);
  if (sorted.length === 0) return null;

  let msg = `\n🏆 *Top 3 — ${bolaoName} (Mata-mata)*\n`;
  const medals = ['🥇', '🥈', '🥉'];
  sorted.forEach((s, i) => {
    msg += `${medals[i]} ${s.name} — ${s.pts} pts\n`;
  });

  return msg;
}

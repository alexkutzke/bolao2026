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
  home_team_label: string | null;
  away_team_label: string | null;
}

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  // Telegram webhook: handle incoming command
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      return await handleTelegramCommand(body);
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ ok: false }), { status: 200, headers });
    }
  }

  // GET: daily report (cron-job.org)
  const url = new URL(req.url);
  const bolaoId = url.searchParams.get('bolao_id');

  try {
    const msg = await buildDailyReport(bolaoId || undefined);
    await sendTelegram(TELEGRAM_CHAT_ID, msg);
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

async function handleTelegramCommand(body: Record<string, unknown>) {
  const msg = body.message as Record<string, unknown> | undefined;
  if (!msg) return new Response(JSON.stringify({ ok: false }), { status: 200 });

  const chatId = String((msg.chat as Record<string, unknown>).id);
  const text = (msg.text as string || '').toLowerCase().trim();

  let reply = '🤖 *Bolão Copa 2026*\n\nComandos:\n/jogos — Jogos de hoje\n/ranking — Top 5 do mata-mata\n/grupos — Top 5 da fase de grupos';

  if (text === '/jogos' || text === '/jogos@seubot') {
    reply = await buildDailyReport();
  } else if (text === '/ranking' || text === '/ranking@seubot') {
    reply = await buildTop5('knockout');
  } else if (text === '/grupos' || text === '/grupos@seubot') {
    reply = await buildTop5('group');
  } else if (text === '/start') {
    reply = '🏆 *Bolão Copa 2026*\n\nUse /jogos para ver os jogos de hoje e /ranking para o top 5 do mata-mata.';
  }

  await sendTelegram(chatId, reply);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

async function buildDailyReport(bolaoId?: string): Promise<string> {
  const now = new Date();
  const brasiliaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

  const todayStart = new Date(brasiliaNow);
  todayStart.setHours(6, 0, 0, 0);
  const startUtc = new Date(todayStart.toLocaleString('en-US', { timeZone: 'UTC' }));

  const todayEnd = new Date(brasiliaNow);
  todayEnd.setDate(todayEnd.getDate() + 1);
  todayEnd.setHours(5, 59, 59, 999);
  const endUtc = new Date(todayEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .gte('match_date', startUtc.toISOString())
    .lte('match_date', endUtc.toISOString())
    .order('match_date', { ascending: true });

  const dateStr = todayStart.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit',
  });

  if (!matches || matches.length === 0) {
    return `📭 Nenhum jogo em ${dateStr}.`;
  }

  let msg = `⚽ *Jogos de ${dateStr}*\n\n`;
  for (const m of matches as Match[]) {
    const homeName = m.home_team_label || m.home_team_name;
    const awayName = m.away_team_label || m.away_team_name;
    const time = new Date(m.match_date).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    });

    if (m.finished && m.home_score !== null) {
      msg += `✅ ${homeName} *${m.home_score} × ${m.away_score}* ${awayName}\n   ${time}\n\n`;
    } else {
      msg += `🕐 ${homeName} vs ${awayName}\n   ${time}\n\n`;
    }
  }

  // Top 3
  const top = await buildTop3(bolaoId);
  if (top) msg += top;

  return msg;
}

async function buildTop3(bolaoId?: string): Promise<string | null> {
  let query = supabase.from('boloes').select('id, name');
  if (bolaoId) query = query.eq('id', bolaoId);
  const { data: boloes } = await query;
  if (!boloes || boloes.length === 0) return null;

  const bolao = boloes[0];
  const { data } = await supabase
    .from('predictions')
    .select('user_id, points, profiles!inner(name)')
    .eq('bolao_id', bolao.id)
    .eq('matches.stage', 'knockout')
    .not('points', 'is', null);

  if (!data || data.length === 0) return null;

  const totals = new Map<string, { name: string; pts: number }>();
  for (const row of data) {
    const entry = totals.get(row.user_id) || { name: (row.profiles as unknown as { name: string }).name, pts: 0 };
    entry.pts += row.points;
    totals.set(row.user_id, entry);
  }

  const sorted = [...totals.values()].sort((a, b) => b.pts - a.pts).slice(0, 3);
  if (sorted.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];
  let msg = `\n🏆 *Top 3 — ${bolao.name}*\n`;
  sorted.forEach((s, i) => { msg += `${medals[i]} ${s.name} — ${s.pts} pts\n`; });
  return msg;
}

async function buildTop5(stage: string): Promise<string> {
  const { data: boloes } = await supabase.from('boloes').select('id, name');
  const bolao = boloes?.[0];
  if (!bolao) return 'Nenhum bolão encontrado.';

  const { data } = await supabase
    .from('predictions')
    .select('user_id, points, profiles!inner(name)')
    .eq('bolao_id', bolao.id)
    .eq('matches.stage', stage)
    .not('points', 'is', null);

  if (!data || data.length === 0) return 'Nenhum ponto registrado ainda.';

  const totals = new Map<string, { name: string; pts: number }>();
  for (const row of data) {
    const entry = totals.get(row.user_id) || { name: (row.profiles as unknown as { name: string }).name, pts: 0 };
    entry.pts += row.points;
    totals.set(row.user_id, entry);
  }

  const sorted = [...totals.values()].sort((a, b) => b.pts - a.pts).slice(0, 5);
  const stageLabel = stage === 'group' ? 'Grupos' : 'Mata-mata';
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  let msg = `🏆 *Top 5 — ${stageLabel}*\n\n`;
  sorted.forEach((s, i) => { msg += `${medals[i]} ${s.name} — ${s.pts} pts\n`; });
  return msg;
}

async function sendTelegram(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

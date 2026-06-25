import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const { action, bolao_id, name, user_id } = await req.json();

    // CREATE bolão
    if (action === 'create') {
      if (!name) {
        return new Response(JSON.stringify({ error: 'Nome do bolão é obrigatório' }), { status: 400, headers });
      }

      // Get admin user id from auth context
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers });
      }

      const { data: bolao, error } = await supabase
        .from('boloes')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      // Add creator as member
      await supabase.from('bolao_members').insert({ bolao_id: bolao.id, user_id: user.id });

      return new Response(JSON.stringify({ success: true, bolao }), { headers });
    }

    // ADD member
    if (action === 'add_member') {
      if (!bolao_id || !user_id) {
        return new Response(JSON.stringify({ error: 'bolao_id e user_id são obrigatórios' }), { status: 400, headers });
      }

      const { error } = await supabase
        .from('bolao_members')
        .insert({ bolao_id, user_id });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // REMOVE member
    if (action === 'remove_member') {
      if (!bolao_id || !user_id) {
        return new Response(JSON.stringify({ error: 'bolao_id e user_id são obrigatórios' }), { status: 400, headers });
      }

      const { error } = await supabase
        .from('bolao_members')
        .delete()
        .eq('bolao_id', bolao_id)
        .eq('user_id', user_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // LIST members of a bolão
    if (action === 'list_members') {
      if (!bolao_id) {
        return new Response(JSON.stringify({ error: 'bolao_id é obrigatório' }), { status: 400, headers });
      }

      const { data: members, error } = await supabase
        .from('bolao_members')
        .select('user_id, profiles(name, email)')
        .eq('bolao_id', bolao_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      return new Response(JSON.stringify({ success: true, members }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida. Use: create, add_member, remove_member, list_members' }), { status: 400, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});

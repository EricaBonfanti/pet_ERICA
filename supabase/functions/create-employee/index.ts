// Edge Function: create-employee
// Cria um Funcionário com e-mail, nome, CPF e senha definidos pelo Dono,
// sem que o Dono precise da service_role key no frontend (insegura de expor).
//
// Deploy: supabase functions deploy create-employee
// Chamada pelo frontend via: supabase.functions.invoke('create-employee', { body: {...} })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, cpf, telefone } = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: 'E-mail, senha e nome são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- 1. Identifica QUEM está chamando (precisa ser um Dono autenticado) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client "anon" para validar o token de quem chamou
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: callerData, error: callerError } = await supabaseAnon.auth.getUser();
    if (callerError || !callerData?.user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client "admin" (service_role) — só existe aqui no backend, nunca no frontend.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Confirma que quem chamou é Dono, e pega o id_pet_shop dele
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, id_pet_shop')
      .eq('id', callerData.user.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil do solicitante não encontrado.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (callerProfile.role !== 'dono' && callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas o Dono do Pet Shop pode cadastrar funcionários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- 2. Cria o usuário de autenticação (com senha definida pelo Dono) ---
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // já vem confirmado, sem precisar de e-mail de verificação
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: `Falha ao criar usuário: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- 3. Cria o perfil (profiles) já como funcionário, vinculado ao Pet Shop do Dono ---
    const { data: newProfile, error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: fullName,
        role: 'funcionario',
        cpf: cpf || null,
        telefone: telefone || null,
        id_pet_shop: callerProfile.id_pet_shop,
        created_by_id: callerData.user.id,
      })
      .select()
      .single();

    if (insertProfileError) {
      // Reverte a criação do usuário de auth, para não deixar um usuário "fantasma" sem perfil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Falha ao criar perfil: ${insertProfileError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, profile: newProfile }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro inesperado.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

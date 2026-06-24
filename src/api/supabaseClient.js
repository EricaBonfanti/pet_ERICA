import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vylyipvewggretpjptaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bHlpcHZld2dncmV0cGpwdGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzYzNDEsImV4cCI6MjA5Nzc1MjM0MX0.QXSb74QP1GWBf9qb_FMxDuT9B2aaji9kFcNl8n_KAu0';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper genérico de CRUD por tabela, no mesmo "formato" que o código já usava
// com base44.entities.X — para minimizar a quantidade de mudanças nas páginas.
function makeEntity(table) {
  return {
    async filter(where = {}, orderBy = '', limit = 100) {
      let query = supabase.from(table).select('*');
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const column = desc ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    // Busca textual com ilike em um campo + filtros eq opcionais
    async search(field, term, where = {}, orderBy = '', limit = 20) {
      let query = supabase.from(table).select('*').ilike(field, `%${term}%`);
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const column = desc ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select();
      if (error) {
        console.error(`[${table}.create] erro do Supabase:`, JSON.stringify(error, null, 2));
        throw new Error(`Falha ao criar registro em ${table}: ${error.message || error.code || 'erro desconhecido'}`);
      }
      if (!data || data.length === 0) {
        console.error(`[${table}.create] insert retornou sem erro, mas sem linhas (RLS?). values:`, values);
        throw new Error(`Não foi possível criar o registro em ${table} (nenhuma linha retornada).`);
      }
      return data[0];
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select();
      if (error) {
        console.error(`[${table}.update] erro do Supabase:`, JSON.stringify(error, null, 2));
        throw new Error(`Falha ao atualizar registro em ${table}: ${error.message || error.code || 'erro desconhecido'}`);
      }
      if (!data || data.length === 0) {
        console.error(`[${table}.update] update retornou sem erro, mas sem linhas (RLS?). id:`, id, 'values:', values);
        throw new Error(`Não foi possível atualizar o registro em ${table} (nenhuma linha retornada).`);
      }
      return data[0];
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

// Tabela "User" é tratada separadamente porque mistura dados de auth (Supabase Auth)
// com o perfil estendido (role, cpf, telefone, id_pet_shop etc.), guardado na tabela "profiles".
const userEntity = {
  ...makeEntity('profiles'),
  // Sobrescreve "update" para fazer upsert: no fluxo de cadastro, a linha em "profiles"
  // ainda não existe no momento em que o app tenta salvar role/cpf/telefone/id_pet_shop.
  async update(id, values) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id, ...values })
      .select();
    if (error) {
      console.error('[userEntity.update] erro do Supabase:', JSON.stringify(error, null, 2));
      throw new Error(`Falha ao salvar perfil: ${error.message || error.code || 'erro desconhecido'}`);
    }
    if (!data || data.length === 0) {
      console.error('[userEntity.update] upsert retornou sem erro, mas sem linhas. Provável bloqueio de RLS silencioso. id:', id, 'values:', values);
      throw new Error('Não foi possível salvar o perfil (nenhuma linha retornada). Verifique as políticas de RLS da tabela profiles.');
    }
    return data[0];
  },
  async me() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw authError || new Error('Não autenticado');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    if (profileError) throw profileError;
    return { ...profile, email: authData.user.email };
  },
};

export const base44 = {
  entities: {
    Pet: makeEntity('Pet'),
    PetShop: makeEntity('PetShop'),
    Agendamento: makeEntity('Agendamento'),
    AuditLog: makeEntity('AuditLog'),
    Notificacao: makeEntity('Notificacao'),
    Pagamento: makeEntity('Pagamento'),
    PlanoMensal: makeEntity('PlanoMensal'),
    Vacina: makeEntity('Vacina'),
    User: userEntity,
  },
  auth: {
    async register({ email, password, emailRedirectTo }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      if (error) throw error;
      return data;
    },
    async verifyOtp({ email, otpCode }) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
      if (error) throw error;
      return { access_token: data?.session?.access_token };
    },
    async resendOtp(email) {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return true;
    },
    async resendSignupEmail(email, emailRedirectTo) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      if (error) throw error;
      return true;
    },
    async login({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return true;
    },
    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    },
    async me() {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data?.user;
    },
    async updateMe(values) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw authError || new Error('Não autenticado');
      const { data, error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', authData.user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    setToken() {
      // No-op: o Supabase gerencia a sessão automaticamente via cookies/localStorage internos do SDK.
    },
    async logout() {
      await supabase.auth.signOut();
      window.location.href = '/login';
    },
  },
  users: {
    // Chama a Edge Function "create-employee", que usa a service_role key
    // no backend para criar a conta de autenticação + o perfil do Funcionário.
    // Nunca expõe a service_role key no frontend.
    async createEmployee({ email, password, fullName, cpf, telefone }) {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: { email, password, fullName, cpf, telefone },
      });
      if (error) {
        throw new Error(error.message || 'Falha ao criar funcionário.');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data?.profile;
    },
  },
};

-- =====================================================================
-- PETLIFY — Schema completo para Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- e clique em "Run". Isso cria todas as tabelas, relacionamentos e
-- regras de segurança (RLS) que isolam os dados de cada Pet Shop.
--
-- SEGURO PARA RODAR MAIS DE UMA VEZ: o bloco abaixo apaga qualquer
-- tabela com esses nomes antes de recriar, então não há problema em
-- rodar novamente se algo tiver dado erro na execução anterior.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. LIMPEZA (remove tabelas antigas, se existirem, antes de recriar)
-- Ordem reversa de dependência para não dar erro de foreign key.
-- ---------------------------------------------------------------------
drop table if exists public."AuditLog" cascade;
drop table if exists public."Notificacao" cascade;
drop table if exists public."Vacina" cascade;
drop table if exists public."Pagamento" cascade;
drop table if exists public."PlanoMensal" cascade;
drop table if exists public."Agendamento" cascade;
drop table if exists public."Pet" cascade;
drop table if exists public."PetShop" cascade;
drop table if exists public.profiles cascade;
drop function if exists public.get_my_pet_shop_id() cascade;

-- ---------------------------------------------------------------------
-- 1. PROFILES (perfil estendido do usuário: role, cpf, pet shop, etc.)
-- Vinculada 1:1 com auth.users (tabela interna de autenticação do Supabase)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('cliente', 'funcionario', 'dono', 'admin')) default 'cliente',
  cpf text,
  telefone text,
  data_nascimento date,
  id_pet_shop uuid,
  lgpd_consent boolean default false,
  chave_acesso text,   -- usado pelo Funcionário na verificação de acesso (RF01)
  chave_master text,   -- usado pelo Dono na verificação de acesso (RF01)
  created_by_id uuid,  -- ID do Dono que convidou este Funcionário
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 2. PET SHOP (a "empresa"/tenant — fundação do modelo multi-tenant)
-- ---------------------------------------------------------------------
create table public."PetShop" (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  endereco text,
  created_date timestamptz default now()
);

-- Agora que a tabela PetShop existe, conectamos a referência de profiles.id_pet_shop
alter table public.profiles
  add constraint fk_profiles_pet_shop foreign key (id_pet_shop) references public."PetShop"(id);

-- ---------------------------------------------------------------------
-- 3. PET
-- ---------------------------------------------------------------------
create table public."Pet" (
  id uuid primary key default gen_random_uuid(),
  nome_pet text not null,
  especie text check (especie in ('Cão', 'Gato', 'Outro')) not null,
  raca text,
  porte text check (porte in ('Pequeno', 'Medio', 'Grande')),
  idade numeric,
  id_tutor uuid references public.profiles(id),
  foto_url text,
  observacoes text,
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 4. AGENDAMENTO
-- ---------------------------------------------------------------------
create table public."Agendamento" (
  id uuid primary key default gen_random_uuid(),
  data_hora timestamptz not null,
  servico text check (servico in ('Banho', 'Tosa', 'Hidratação', 'Corte de unha', 'Limpeza de ouvido')) not null,
  status text check (status in ('Pendente', 'Confirmado', 'Concluido', 'Cancelado')) default 'Pendente',
  id_cliente uuid references public.profiles(id) not null,
  id_pet uuid references public."Pet"(id) not null,
  nome_pet text,
  nome_cliente text,
  observacoes text,
  valor numeric,
  tipo_cobranca text check (tipo_cobranca in ('coberto_pelo_plano', 'avulso')) default 'avulso',
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5. PLANO MENSAL (assinatura de um pet a um dos 3 planos fixos)
-- ---------------------------------------------------------------------
create table public."PlanoMensal" (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor_mensal numeric not null,
  id_pet uuid references public."Pet"(id) not null,
  nome_pet text,
  id_tutor uuid references public.profiles(id) not null,
  nome_tutor text,
  status text check (status in ('Ativo', 'Inadimplente', 'Inativo', 'Cancelado')) default 'Ativo',
  data_inicio date,
  data_vencimento date,
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 6. PAGAMENTO
-- ---------------------------------------------------------------------
create table public."Pagamento" (
  id uuid primary key default gen_random_uuid(),
  valor numeric not null,
  forma_pagamento text check (forma_pagamento in ('PIX', 'Cartao', 'Dinheiro')) not null,
  tipo text check (tipo in ('Mensalidade', 'ServicoAvulso', 'Estorno', 'Ajuste')),
  id_cliente uuid references public.profiles(id) not null,
  nome_cliente text,
  id_pet uuid references public."Pet"(id),
  nome_pet text,
  id_plano uuid references public."PlanoMensal"(id),
  id_funcionario uuid references public.profiles(id),
  nome_funcionario text,
  confirmado boolean default true,
  observacoes text,
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 7. VACINA (carteira de vacinação — RF06)
-- ---------------------------------------------------------------------
create table public."Vacina" (
  id uuid primary key default gen_random_uuid(),
  nome_vacina text not null,
  id_pet uuid references public."Pet"(id) not null,
  nome_pet text,
  id_tutor uuid references public.profiles(id),
  nome_tutor text,
  cpf_tutor text,
  data_aplicacao date not null,
  data_validade date,
  lote text,
  veterinario text,
  confirmado boolean default true,
  observacoes text,
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 8. NOTIFICACAO (RF05 — alertas de vacina, pagamento, agendamento)
-- ---------------------------------------------------------------------
create table public."Notificacao" (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid references public.profiles(id) not null,
  titulo text not null,
  mensagem text not null,
  tipo text check (tipo in ('VacinaVencida', 'VacinaAVencer', 'Pagamento', 'Agendamento', 'Geral')) not null,
  lida boolean default false,
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 9. AUDIT LOG (RF03 — trilha de auditoria imutável)
-- ---------------------------------------------------------------------
create table public."AuditLog" (
  id uuid primary key default gen_random_uuid(),
  acao text not null,
  entidade text not null,
  entidade_id text,
  usuario_id uuid references public.profiles(id) not null,
  usuario_nome text,
  detalhes text,
  ip_address text,
  id_pet_shop uuid references public."PetShop"(id),
  created_date timestamptz default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) — isolamento multi-tenant (RF07)
-- Sem isso, qualquer usuário logado conseguiria ler dados de QUALQUER
-- Pet Shop. As regras abaixo garantem que cada usuário só vê dados
-- do seu próprio Pet Shop (e o Cliente só vê os próprios dados).
-- =====================================================================

-- Habilita RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public."PetShop" enable row level security;
alter table public."Pet" enable row level security;
alter table public."Agendamento" enable row level security;
alter table public."PlanoMensal" enable row level security;
alter table public."Pagamento" enable row level security;
alter table public."Vacina" enable row level security;
alter table public."Notificacao" enable row level security;
alter table public."AuditLog" enable row level security;

-- ---------------------------------------------------------------------
-- Função auxiliar (SECURITY DEFINER) para evitar recursão infinita.
-- Sem esta função, qualquer policy de "profiles" que precise consultar
-- a própria tabela "profiles" entra em loop (a policy dispara a si mesma
-- de novo a cada subconsulta). SECURITY DEFINER faz essa função rodar
-- com permissões elevadas, ignorando o RLS internamente, então ela
-- pode ler o id_pet_shop sem reacionar a policy.
-- ---------------------------------------------------------------------
create or replace function public.get_my_pet_shop_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id_pet_shop from public.profiles where id = auth.uid();
$$;

-- profiles: usuário pode ler o próprio perfil; staff pode ler perfis do mesmo pet shop
create policy "profiles_select_own_or_same_shop" on public.profiles
  for select using (
    id = auth.uid()
    or id_pet_shop = public.get_my_pet_shop_id()
  );
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- PetShop: qualquer usuário autenticado pode LER (necessário para a busca de pet shop no cadastro);
-- a criação acontece via cadastro do Dono (sem restrição de shop ainda, pois é o próprio ato de criar o tenant)
create policy "petshop_select_all" on public."PetShop"
  for select using (true);
create policy "petshop_insert_any_authenticated" on public."PetShop"
  for insert with check (auth.uid() is not null);

-- Para as tabelas operacionais (Pet, Agendamento, PlanoMensal, Pagamento, Vacina, Notificacao, AuditLog):
-- usuário só acessa linhas do MESMO id_pet_shop ao qual pertence.
create policy "pet_same_shop" on public."Pet"
  for all using (id_pet_shop = public.get_my_pet_shop_id());

create policy "agendamento_same_shop" on public."Agendamento"
  for all using (id_pet_shop = public.get_my_pet_shop_id());

create policy "planomensal_same_shop" on public."PlanoMensal"
  for all using (id_pet_shop = public.get_my_pet_shop_id());

create policy "pagamento_same_shop" on public."Pagamento"
  for all using (id_pet_shop = public.get_my_pet_shop_id());

create policy "vacina_same_shop" on public."Vacina"
  for all using (id_pet_shop = public.get_my_pet_shop_id());

create policy "notificacao_same_shop_or_own" on public."Notificacao"
  for all using (
    id_usuario = auth.uid()
    or id_pet_shop = public.get_my_pet_shop_id()
  );

create policy "auditlog_same_shop" on public."AuditLog"
  for all using (id_pet_shop = public.get_my_pet_shop_id());

-- =====================================================================
-- FIM DO SCHEMA
-- Depois de rodar isto com sucesso, vá em Authentication → Providers
-- e confirme que "Email" está habilitado, e em Authentication → Settings
-- configure o template de e-mail (OTP de 6 dígitos, se preferir, em vez
-- de magic link).
-- =====================================================================

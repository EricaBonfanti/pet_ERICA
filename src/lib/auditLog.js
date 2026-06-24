import { base44 } from '@/api/supabaseClient';

export async function logAudit({ acao, entidade, entidade_id, detalhes }) {
  // base44.auth.me() retorna o usuário puro do Supabase Auth (sem full_name/id_pet_shop).
  // Esses campos só existem em "profiles" (base44.entities.User.me()).
  const profile = await base44.entities.User.me();
  await base44.entities.AuditLog.create({
    acao,
    entidade,
    entidade_id: entidade_id || '',
    usuario_id: profile.id,
    usuario_nome: profile.full_name || profile.email || 'Usuário',
    detalhes: typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes),
    id_pet_shop: profile.id_pet_shop || null,
  });
}
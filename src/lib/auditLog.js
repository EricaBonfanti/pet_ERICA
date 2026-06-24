import { base44 } from '@/api/supabaseClient';

export async function logAudit({ acao, entidade, entidade_id, detalhes }) {
  const user = await base44.auth.me();
  await base44.entities.AuditLog.create({
    acao,
    entidade,
    entidade_id: entidade_id || '',
    usuario_id: user.id,
    usuario_nome: user.full_name || user.email,
    detalhes: typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes),
    id_pet_shop: user.id_pet_shop || '',
  });
}
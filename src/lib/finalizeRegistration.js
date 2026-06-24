import { base44 } from '@/api/supabaseClient';
import { generateUniqueSlug } from '@/lib/slug';

const STORAGE_KEY = 'petlify_reg_data';

// Lê os dados salvos no sessionStorage durante o formulário de cadastro
// e cria o profile (+ PetShop, se for Dono) depois que o e-mail foi confirmado.
// Retorna true se havia dados pendentes e a finalização ocorreu; false se não havia nada a fazer
// (ex.: usuário já tinha completado o cadastro antes).
export async function finalizeRegistration(userId) {
  console.log('[finalizeRegistration] iniciando para userId:', userId);
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    console.warn('[finalizeRegistration] nenhum dado pendente em sessionStorage. Abortando sem criar profile.');
    return false;
  }

  const regData = JSON.parse(raw);
  console.log('[finalizeRegistration] regData:', regData);

  if (regData.mode === 'dono') {
    const slugGenerated = await generateUniqueSlug(base44, regData.shopName);
    console.log('[finalizeRegistration] slug gerado:', slugGenerated);

    const shop = await base44.entities.PetShop.create({
      nome: regData.shopName,
      slug: slugGenerated,
      endereco: regData.shopAddress || '',
    });
    console.log('[finalizeRegistration] PetShop criado:', shop);

    if (!shop?.id) {
      throw new Error('Falha ao criar o Pet Shop: nenhum ID retornado.');
    }

    const profile = await base44.entities.User.update(userId, {
      role: 'dono',
      full_name: regData.fullName,
      cpf: regData.cpf,
      telefone: regData.telefone,
      data_nascimento: regData.dataNascimento,
      id_pet_shop: shop.id,
      lgpd_consent: regData.lgpd,
    });
    console.log('[finalizeRegistration] profile (dono) criado/atualizado:', profile);

    if (!profile?.id) {
      throw new Error('Falha ao criar o perfil do Dono: nenhuma linha retornada (possível bloqueio de RLS).');
    }

    sessionStorage.setItem('petlify_new_shop_slug', slugGenerated);
    sessionStorage.setItem('petlify_new_shop_name', regData.shopName);
  } else {
    const profile = await base44.entities.User.update(userId, {
      role: 'cliente',
      full_name: regData.fullName,
      cpf: regData.cpf,
      telefone: regData.telefone,
      data_nascimento: regData.dataNascimento,
      id_pet_shop: regData.selectedShopId,
      lgpd_consent: regData.lgpd,
    });
    console.log('[finalizeRegistration] profile (cliente) criado/atualizado:', profile);

    if (!profile?.id) {
      throw new Error('Falha ao criar o perfil do Cliente: nenhuma linha retornada (possível bloqueio de RLS).');
    }
  }

  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem('petlify_2fa_verified');
  console.log('[finalizeRegistration] concluído com sucesso.');
  return true;
}

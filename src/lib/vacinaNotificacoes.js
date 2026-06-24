import { base44 } from '@/api/supabaseClient';

const DIAS_ANTECEDENCIA = 30;

/**
 * Verifica as vacinas do Pet Shop do usuário e cria notificações para o
 * tutor de cada pet cuja vacina esteja VENCIDA ou a vencer em até 30 dias.
 * Evita duplicar notificações já existentes para a mesma vacina.
 * Chamada sempre que o app carrega (ver AppLayout.jsx).
 */
export async function checarVacinasEGerarNotificacoes(idPetShop) {
  if (!idPetShop) return;

  try {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + DIAS_ANTECEDENCIA);

    const vacinas = await base44.entities.Vacina.filter({ id_pet_shop: idPetShop }, '-data_validade', 500);

    const relevantes = (vacinas || []).filter((v) => {
      if (!v.data_validade) return false;
      const validade = new Date(v.data_validade);
      return validade <= limite; // vencida OU a vencer em até 30 dias
    });

    if (relevantes.length === 0) return;

    // Notificações já existentes, para não duplicar a cada carregamento da página.
    const notificacoesExistentes = await base44.entities.Notificacao.filter(
      { id_pet_shop: idPetShop },
      '',
      1000
    );
    const jaNotificadas = new Set(
      (notificacoesExistentes || [])
        .filter((n) => n.tipo === 'VacinaVencida' || n.tipo === 'VacinaAVencer')
        .map((n) => n.referencia_id)
        .filter(Boolean)
    );

    for (const vacina of relevantes) {
      if (jaNotificadas.has(vacina.id)) continue;
      if (!vacina.id_tutor) continue;

      const validade = new Date(vacina.data_validade);
      const vencida = validade < hoje;
      const tipo = vencida ? 'VacinaVencida' : 'VacinaAVencer';
      const dataFormatada = validade.toLocaleDateString('pt-BR');

      const titulo = vencida ? 'Vacina vencida' : 'Vacina a vencer';
      const mensagem = vencida
        ? `A vacina ${vacina.nome_vacina} de ${vacina.nome_pet || 'seu pet'} venceu em ${dataFormatada}. Agende uma atualização.`
        : `A vacina ${vacina.nome_vacina} de ${vacina.nome_pet || 'seu pet'} vence em ${dataFormatada}. Agende a renovação.`;

      await base44.entities.Notificacao.create({
        id_usuario: vacina.id_tutor,
        titulo,
        mensagem,
        tipo,
        lida: false,
        referencia_id: vacina.id,
        id_pet_shop: idPetShop,
      });
    }
  } catch (e) {
    // Falha silenciosa: a geração de notificações não deve travar o carregamento do app.
    console.error('[checarVacinasEGerarNotificacoes] erro:', e);
  }
}

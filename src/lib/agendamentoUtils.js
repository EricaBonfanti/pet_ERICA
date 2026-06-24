// Utilitários de agendamento: conflito de horário, cancelamento, slots disponíveis

// Duração em minutos por porte
export const DURACAO_POR_PORTE = {
  Pequeno: 30,
  Medio: 60,
  Grande: 120,
};

export function getDuracaoMinutos(porte) {
  return DURACAO_POR_PORTE[porte] || 60;
}

/**
 * Verifica se dois agendamentos conflitam no mesmo pet shop.
 * Considera a duração de cada um baseada no porte do pet.
 */
export function hasConflito(novoDataHora, novoDuracaoMin, agendamentosExistentes, petsMap, editandoId = null) {
  const novoInicio = new Date(novoDataHora).getTime();
  const novoFim = novoInicio + novoDuracaoMin * 60 * 1000;

  for (const ag of agendamentosExistentes) {
    if (ag.id === editandoId) continue;
    if (ag.status === 'Cancelado') continue;

    const pet = petsMap[ag.id_pet];
    const duracaoExistente = getDuracaoMinutos(pet?.porte || 'Medio');
    const existInicio = new Date(ag.data_hora).getTime();
    const existFim = existInicio + duracaoExistente * 60 * 1000;

    // Sobrepõe se os intervalos se cruzam
    if (novoInicio < existFim && novoFim > existInicio) {
      return ag; // retorna o agendamento conflitante
    }
  }
  return null;
}

/**
 * Retorna os slots disponíveis de um dia para o pet shop.
 * Horário de funcionamento: 08:00 - 18:00
 * Intervalo mínimo entre slots: 30 min
 */
export function getSlotsDisponiveis(data, agendamentosExistentes, petsMap, duracaoNovoMin = 60, editandoId = null) {
  const HORA_INICIO = 8 * 60;  // 08:00 em minutos
  const HORA_FIM = 22 * 60;    // 22:00 em minutos
  const INTERVALO = 30;

  const slots = [];
  // "2026-06-26" sem horário é interpretado pelo JS como meia-noite em UTC, não no
  // fuso local — no Brasil (UTC-3) isso "puxa" o Date pro dia anterior quando depois
  // convertemos pra meia-noite local. Por isso montamos a data manualmente com
  // ano/mês/dia, que o JS sempre interpreta como horário LOCAL.
  const [anoBase, mesBase, diaBase] = data.split('-').map(Number);
  const dataBase = new Date(anoBase, mesBase - 1, diaBase, 0, 0, 0, 0);

  for (let min = HORA_INICIO; min + duracaoNovoMin <= HORA_FIM; min += INTERVALO) {
    const slotDate = new Date(dataBase.getTime() + min * 60 * 1000);
    const conflict = hasConflito(slotDate.toISOString(), duracaoNovoMin, agendamentosExistentes, petsMap, editandoId);
    slots.push({
      hora: slotDate,
      label: `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`,
      disponivel: !conflict,
      conflito: conflict,
    });
  }
  return slots;
}

/**
 * Verifica se pode cancelar (6h de antecedência).
 * Retorna { pode: true } ou { pode: false, deveCobrança: true }
 */
export function podeCancelar(dataHora) {
  const agora = new Date();
  const horario = new Date(dataHora);
  const diffHoras = (horario - agora) / (1000 * 60 * 60);
  if (diffHoras >= 6) return { pode: true };
  if (diffHoras > 0) return { pode: false, deveCobranca: true }; // ainda no futuro mas < 6h
  return { pode: false, deveCobranca: false }; // já passou
}

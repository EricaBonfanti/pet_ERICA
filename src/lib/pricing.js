// Tabela de preços fixa e padronizada — válida para TODA a plataforma Petlify
// Nenhum Pet Shop pode alterar estes valores

export const PLANOS_FIXOS = [
  {
    nome: 'Básico',
    valor: 99,
    descricao: 'Banho/tosa 1x a cada 15 dias',
    beneficios: ['Banho 2x/mês', 'Tosa 2x/mês'],
    cor: 'bg-blue-50 border-blue-200',
    corBadge: 'bg-blue-100 text-blue-700',
    corBtn: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    nome: 'Premium',
    valor: 189,
    descricao: 'Banho/tosa 1x por semana',
    beneficios: ['Banho 4x/mês', 'Tosa 4x/mês'],
    cor: 'bg-purple-50 border-purple-200',
    corBadge: 'bg-purple-100 text-purple-700',
    corBtn: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    nome: 'Premium Plus',
    valor: 349,
    descricao: 'Banho/tosa 2x por semana + hidratação + corte de unha + limpeza de ouvido',
    beneficios: ['Banho 8x/mês', 'Tosa 8x/mês', 'Hidratação', 'Corte de unha', 'Limpeza de ouvido'],
    cor: 'bg-amber-50 border-amber-200',
    corBadge: 'bg-amber-100 text-amber-700',
    corBtn: 'bg-amber-600 hover:bg-amber-700',
  },
];

export const SERVICOS_AVULSOS = {
  'Banho': 60,
  'Tosa': 50,
  'Hidratação': 40,
  'Corte de unha': 20,
  'Limpeza de ouvido': 20,
};

export const SERVICOS_AVULSOS_LISTA = Object.entries(SERVICOS_AVULSOS).map(([nome, valor]) => ({ nome, valor }));

export const getPrecoAvulso = (servico) => SERVICOS_AVULSOS[servico] ?? null;

export const getPlanoPorNome = (nome) => PLANOS_FIXOS.find((p) => p.nome === nome) || null;
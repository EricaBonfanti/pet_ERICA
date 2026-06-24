// Vacinas comuns pré-cadastradas por espécie, para seleção rápida na Carteira de Vacinação.
// Mantém também a opção de texto livre para vacinas fora da lista padrão.

export const VACINAS_POR_ESPECIE = {
  'Cão': [
    'Polivalente (V8/V10)',
    'Antirrábica',
    'Giardíase',
    'Gripe Canina (Tosse dos Canis)',
    'Leishmaniose',
  ],
  'Gato': [
    'Polivalente Felina (V3/V4/V5)',
    'Antirrábica',
    'Leucemia Felina (FeLV)',
  ],
  'Outro': [],
};

export const OUTRA_VACINA = 'Outra (especificar)';

export const getVacinasParaEspecie = (especie) => [
  ...(VACINAS_POR_ESPECIE[especie] || []),
  OUTRA_VACINA,
];

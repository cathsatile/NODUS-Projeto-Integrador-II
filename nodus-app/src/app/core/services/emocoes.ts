export interface Emocao {
  valor: number;
  label: string;
  emoji: string;
}

export const EMOCOES: readonly Emocao[] = [
  { valor: 1,  label: 'Alegre',          emoji: '😊' },
  { valor: 2,  label: 'Confiante',       emoji: '💪' },
  { valor: 3,  label: 'Esperançoso',     emoji: '🌟' },
  { valor: 4,  label: 'Tranquilo',       emoji: '😌' },
  { valor: 5,  label: 'Ansioso',         emoji: '😰' },
  { valor: 6,  label: 'Confuso',         emoji: '😕' },
  { valor: 7,  label: 'Existencialista', emoji: '🤔' },
  { valor: 8,  label: 'Frustrado',       emoji: '😤' },
  { valor: 9,  label: 'Nervoso',         emoji: '😬' },
  { valor: 10, label: 'Sobrecarregado',  emoji: '😩' },
  { valor: 11, label: 'Triste',          emoji: '😢' },
];

export const emocaoLabel = (valor: number | undefined): string => {
  if (valor == null) return '—';
  return EMOCOES.find(e => e.valor === valor)?.label ?? String(valor);
};

export const emocaoEmoji = (valor: number | undefined): string => {
  if (valor == null) return '';
  return EMOCOES.find(e => e.valor === valor)?.emoji ?? '';
};

export const STATUS_SESSAO = [
  { valor: 'realizada',           label: 'Sessão realizada' },
  { valor: 'cancelada_paciente',  label: 'Cancelado pelo paciente' },
  { valor: 'cancelada_psicologo', label: 'Cancelado pelo psicólogo' },
  { valor: 'nao_compareceu',      label: 'Paciente não compareceu' },
  { valor: 'remarcada',           label: 'Sessão remarcada' },
] as const;

export type StatusSessao = typeof STATUS_SESSAO[number]['valor'];

export const statusLabel = (valor: string | undefined): string => {
  if (!valor) return '';
  return STATUS_SESSAO.find(s => s.valor === valor)?.label ?? valor;
};

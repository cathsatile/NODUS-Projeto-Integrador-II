export interface Sessao {
  id_sessao?: number;
  data: string;
  horario: string;
  observacoes?: string;
  id_paciente: number;
  id_psicologo: number;
}

export interface CriarSessaoDto {
  data: string;
  horario: string;
  observacoes?: string;
  id_paciente: number;
  id_psicologo: number;
}
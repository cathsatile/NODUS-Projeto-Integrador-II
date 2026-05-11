export interface Sessao {
  id_sessao?: number;
  data: string; // "YYYY-MM-DDTHH:mm:ss"
  observacoes?: string;
  id_paciente: number;
  id_psicologo: number;
}

export interface CriarSessaoDto {
  data: string;
  observacoes?: string;
  id_paciente: number;
  id_psicologo: number;
}
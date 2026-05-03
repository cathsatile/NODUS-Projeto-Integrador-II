export interface Sessao {
  id_sessao?: number;
  data: string; // formato ISO: "YYYY-MM-DDTHH:mm:ss"
  observacoes?: string;
  id_paciente: number;
  id_psicologo: number;
}
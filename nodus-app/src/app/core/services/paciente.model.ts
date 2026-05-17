export interface Paciente {
  id_paciente?: number;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento: string;
  id_psicologo: number;
}
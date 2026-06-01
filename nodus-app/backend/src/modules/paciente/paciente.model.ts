export interface Paciente {
  id_paciente?: number;
  nome: string;
  email: string;
  senha?: string | null;
  data_nascimento: string;
  id_psicologo: number;
}

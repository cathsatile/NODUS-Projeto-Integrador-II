export interface Paciente {
  id_paciente?: number;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento: string;
  id_psicologo: number;
}

export interface CriarPacienteDto {
  nome: string;
  email: string;
  data_nascimento: string;
  id_psicologo: number;
}
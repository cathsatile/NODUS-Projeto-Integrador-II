export interface Paciente {
  id_paciente?: number;
  nome: string;
  email: string;
  senha: string;
  data_nascimento: string; // formato ISO: "YYYY-MM-DD"
  id_psicologo: number;
}
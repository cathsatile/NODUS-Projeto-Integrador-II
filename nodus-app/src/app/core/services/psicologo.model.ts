export interface Psicologo {
  id_psicologo?: number;
  nome: string;
  email: string;
  registro_profissional: string;
  /*senha não volta do backend*/
}

export interface CriarPsicologoDto {
  nome: string;
  email: string;
  senha: string;
  registro_profissional: string;
}
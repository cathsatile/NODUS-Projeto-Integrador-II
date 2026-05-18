import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as psicologoRepo from '../psicologo/psicologo.repository';
import * as psicologoService from '../psicologo/psicologo.service';
import { Psicologo } from '../psicologo/psicologo.model';

const JWT_SECRET = process.env.JWT_SECRET ?? 'nodus_dev_secret_change_in_prod';
const JWT_EXPIRES = '8h';

export interface PsicologoPublico {
  id_psicologo: number;
  nome: string;
  email: string;
  registro_profissional: string;
}

export interface AuthResponse {
  token: string;
  psicologo: PsicologoPublico;
}

export const login = async (email: string, senha: string): Promise<AuthResponse> => {
  const psicologo = await psicologoRepo.findByEmail(email);
  if (!psicologo) throw new Error('CREDENCIAIS_INVALIDAS');

  const senhaCorreta = await bcrypt.compare(senha, psicologo.senha);
  if (!senhaCorreta) throw new Error('CREDENCIAIS_INVALIDAS');

  const psicologoPublico: PsicologoPublico = {
    id_psicologo: psicologo.id_psicologo!,
    nome: psicologo.nome,
    email: psicologo.email,
    registro_profissional: psicologo.registro_profissional,
  };

  const token = jwt.sign(
    { sub: psicologo.id_psicologo, ...psicologoPublico },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { token, psicologo: psicologoPublico };
};

export const register = async (data: Psicologo): Promise<AuthResponse> => {
  const existente = await psicologoRepo.findByEmail(data.email);
  if (existente) throw new Error('EMAIL_JA_CADASTRADO');

  const psicologo = await psicologoService.create(data);

  const psicologoPublico: PsicologoPublico = {
    id_psicologo: psicologo.id_psicologo!,
    nome: psicologo.nome,
    email: psicologo.email,
    registro_profissional: psicologo.registro_profissional,
  };

  const token = jwt.sign(
    { sub: psicologo.id_psicologo, ...psicologoPublico },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { token, psicologo: psicologoPublico };
};

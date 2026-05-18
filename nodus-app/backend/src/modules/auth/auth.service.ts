import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../database/db';

const JWT_SECRET = process.env.JWT_SECRET ?? 'segredo_provisorio';
const JWT_EXPIRES_IN = '8h';

export const login = async (email: string, senha: string) => {
  // Busca o psicólogo pelo email (aqui sim precisamos da senha para comparar)
  const result = await pool.query(
    'SELECT id_psicologo, nome, email, senha FROM psicologo WHERE email = $1',
    [email]
  );

  const psicologo = result.rows[0];
  if (!psicologo) throw new Error('CREDENCIAIS_INVALIDAS');

  const senhaValida = await bcrypt.compare(senha, psicologo.senha);
  if (!senhaValida) throw new Error('CREDENCIAIS_INVALIDAS');
//propositalmente vago pra não dar informaçao pra um possivel mau ator

  const token = jwt.sign(
    {
      id: psicologo.id_psicologo,
      nome: psicologo.nome,
      email: psicologo.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    psicologo: {
      id_psicologo: psicologo.id_psicologo,
      nome: psicologo.nome,
      email: psicologo.email
    }
  };
};
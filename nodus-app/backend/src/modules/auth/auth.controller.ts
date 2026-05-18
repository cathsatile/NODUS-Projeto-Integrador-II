import { Router, Request, Response } from 'express';
import * as service from './auth.service';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await service.login(email, senha);
    res.json(result);
  } catch (err: any) {
    console.error('Erro no login:', err);
    if (err.message === 'CREDENCIAIS_INVALIDAS') {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});
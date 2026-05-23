import { Router, Request, Response } from 'express';
import * as service from './auth.service';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body as { email?: string; senha?: string };
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    const result = await service.login(email, senha);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CREDENCIAIS_INVALIDAS') {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EMAIL_JA_CADASTRADO') {
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

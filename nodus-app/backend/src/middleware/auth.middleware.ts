import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: number;
  nome: string;
  email: string;
  registro_profissional: string;
  exp: number;
  iat: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      psicologoId: number;
      psicologoEmail: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'nodus_dev_secret_change_in_prod';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    req.psicologoId = payload.sub;
    req.psicologoEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

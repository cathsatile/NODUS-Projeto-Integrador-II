import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { authMiddleware } from '../src/middleware/auth.middleware';

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe('authMiddleware', () => {
  it('bloqueia requisição sem header Authorization', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia token inválido', () => {
    const req = { headers: { authorization: 'Bearer token_invalido' } } as Request;
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('libera a requisição e popula req.psicologoId com token válido', () => {
    const token = jwt.sign({ sub: 42, email: 'ana@nodus.com' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.psicologoId).toBe(42);
  });
});

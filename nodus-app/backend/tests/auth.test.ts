import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { resetDb } from './db-helpers';
import * as authService from '../src/modules/auth/auth.service';
import * as psicologoRepo from '../src/modules/psicologo/psicologo.repository';
import bcrypt from 'bcryptjs';

beforeEach(resetDb);

describe('auth.service.login', () => {
  it('retorna token válido e dados públicos com credenciais corretas', async () => {
    const senhaHash = await bcrypt.hash('senha123', 10);
    await psicologoRepo.create({ nome: 'Ana', email: 'ana@nodus.com', senha: senhaHash, registro_profissional: 'CRP-1' });

    const resultado = await authService.login('ana@nodus.com', 'senha123');

    expect(resultado.psicologo).not.toHaveProperty('senha');
    const payload = jwt.verify(resultado.token, process.env.JWT_SECRET!) as { sub: number };
    expect(payload.sub).toBe(resultado.psicologo.id_psicologo);
  });

  it('rejeita email inexistente', async () => {
    await expect(authService.login('ninguem@nodus.com', 'x')).rejects.toThrow('CREDENCIAIS_INVALIDAS');
  });

  it('rejeita senha incorreta', async () => {
    const senhaHash = await bcrypt.hash('correta', 10);
    await psicologoRepo.create({ nome: 'Ana', email: 'ana@nodus.com', senha: senhaHash, registro_profissional: 'CRP-1' });

    await expect(authService.login('ana@nodus.com', 'errada')).rejects.toThrow('CREDENCIAIS_INVALIDAS');
  });
});

describe('auth.service.register', () => {
  it('rejeita email já cadastrado', async () => {
    await psicologoRepo.create({ nome: 'Ana', email: 'ana@nodus.com', senha: 'hash', registro_profissional: 'CRP-1' });

    await expect(
      authService.register({ nome: 'Outra Ana', email: 'ana@nodus.com', senha: 'x', registro_profissional: 'CRP-2' }),
    ).rejects.toThrow('EMAIL_JA_CADASTRADO');
  });

  it('cria novo psicólogo e retorna token', async () => {
    const resultado = await authService.register({
      nome: 'Bia', email: 'bia@nodus.com', senha: 'senha123', registro_profissional: 'CRP-3',
    });

    expect(resultado.token).toBeTruthy();
    expect(resultado.psicologo.email).toBe('bia@nodus.com');
  });
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './modules/auth/auth.controller';
import { psicologoRouter } from './modules/psicologo/psicologo.controller';
import { pacienteRouter } from './modules/paciente/paciente.controller';
import { sessaoRouter } from './modules/sessao/sessao.controller';
import { authMiddleware } from './middleware/auth.middleware';

dotenv.config();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4200';

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

// Rotas públicas (não exigem token)
app.use('/api/auth', authRouter);

// Rotas protegidas — exigem JWT válido
app.use('/api/psicologos', authMiddleware, psicologoRouter);
app.use('/api/pacientes', authMiddleware, pacienteRouter);
app.use('/api/sessoes', authMiddleware, sessaoRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Servidor NODUS rodando na porta ${PORT}`);
});
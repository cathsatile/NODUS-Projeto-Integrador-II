import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.controller';
import { psicologoRouter } from './modules/psicologo/psicologo.controller';
import { pacienteRouter } from './modules/paciente/paciente.controller';
import { sessaoRouter } from './modules/sessao/sessao.controller';
import { autenticar } from './middleware/auth.middleware';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/psicologos', psicologoRouter);
app.use('/api/pacientes', autenticar, pacienteRouter);
app.use('/api/sessoes', autenticar, sessaoRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`SERVIDOR RODANDO !!!!!!!! http://localhost:${PORT}`);
});
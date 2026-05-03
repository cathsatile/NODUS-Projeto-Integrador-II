import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { psicologoRouter } from './modules/psicologo/psicologo.controller';
import { pacienteRouter } from './modules/paciente/paciente.controller';
import { sessaoRouter } from './modules/sessao/sessao.controller';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/psicologos', psicologoRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`SERVIDOR RODANDO!!!!!!!!! http://localhost:${PORT}`);
});
app.use('/api/psicologos', psicologoRouter);
app.use('/api/pacientes', pacienteRouter);
app.use('/api/sessoes', sessaoRouter);
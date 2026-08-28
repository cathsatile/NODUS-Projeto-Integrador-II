import { db } from '../src/database/db';

// Limpa as tabelas entre testes, mantendo o schema (criado uma vez no import de db.ts).
export const resetDb = (): void => {
  db.exec('DELETE FROM sessao; DELETE FROM paciente; DELETE FROM psicologo;');
};

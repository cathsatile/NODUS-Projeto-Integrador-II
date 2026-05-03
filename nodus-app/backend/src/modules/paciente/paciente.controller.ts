import { Router, Request, Response } from 'express';
import * as service from './paciente.service';

export const pacienteRouter = Router();

pacienteRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await service.getAll();
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar pacientes:', err);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

pacienteRouter.get('/psicologo/:id_psicologo', async (req: Request, res: Response) => {
  try {
    const data = await service.getByPsicologo(Number(req.params.id_psicologo));
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar pacientes do psicólogo:', err);
    res.status(500).json({ error: 'Erro ao buscar pacientes do psicólogo' });
  }
});

pacienteRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar paciente:', err);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

pacienteRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Erro ao criar paciente:', err);
    if (err.message === 'Email é obrigatório') {
      return res.status(400).json({ error: err.message });
    }
    // Email duplicado — violação de UNIQUE no postgres
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
});

pacienteRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar paciente:', err);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

pacienteRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await service.remove(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar paciente:', err);
    res.status(500).json({ error: 'Erro ao deletar paciente' });
  }
});
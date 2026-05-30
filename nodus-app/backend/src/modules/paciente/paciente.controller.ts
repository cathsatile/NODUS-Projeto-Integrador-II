import { Router, Request, Response } from 'express';
import * as service from './paciente.service';

export const pacienteRouter = Router();

// Retorna apenas os pacientes do psicólogo autenticado
pacienteRouter.get('/', async (req: Request, res: Response) => {
  try {
    const data = await service.getByPsicologo(req.psicologoId);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar pacientes:', err);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// Mantido por compatibilidade — valida que o id da rota pertence ao token
pacienteRouter.get('/psicologo/:id_psicologo', async (req: Request, res: Response) => {
  try {
    if (Number(req.params.id_psicologo) !== req.psicologoId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const data = await service.getByPsicologo(req.psicologoId);
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
    if (data.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar paciente:', err);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// id_psicologo do body é ignorado — sempre usa o do token
pacienteRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = await service.create({ ...req.body, id_psicologo: req.psicologoId });
    res.status(201).json(data);
  } catch (err: unknown) {
    console.error('Erro ao criar paciente:', err);
    if (err instanceof Error && err.message === 'Email é obrigatório') {
      return res.status(400).json({ error: err.message });
    }
    if ((err as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
});

pacienteRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const existente = await service.getById(Number(req.params.id));
    if (!existente) return res.status(404).json({ error: 'Paciente não encontrado' });
    if (existente.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    const data = await service.update(Number(req.params.id), req.body);
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar paciente:', err);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

pacienteRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existente = await service.getById(Number(req.params.id));
    if (!existente) return res.status(404).json({ error: 'Paciente não encontrado' });
    if (existente.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    await service.remove(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar paciente:', err);
    res.status(500).json({ error: 'Erro ao deletar paciente' });
  }
});

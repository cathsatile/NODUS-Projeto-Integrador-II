import { Router, Request, Response } from 'express';
import * as service from './sessao.service';

export const sessaoRouter = Router();

sessaoRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await service.getAll();
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessões:', err);
    res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

sessaoRouter.get('/paciente/:id_paciente', async (req: Request, res: Response) => {
  try {
    const data = await service.getByPaciente(Number(req.params.id_paciente));
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessões do paciente:', err);
    res.status(500).json({ error: 'Erro ao buscar sessões do paciente' });
  }
});

sessaoRouter.get('/psicologo/:id_psicologo', async (req: Request, res: Response) => {
  try {
    const data = await service.getByPsicologo(Number(req.params.id_psicologo));
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessões do psicólogo:', err);
    res.status(500).json({ error: 'Erro ao buscar sessões do psicólogo' });
  }
});

sessaoRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessão:', err);
    res.status(500).json({ error: 'Erro ao buscar sessão' });
  }
});

sessaoRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Erro ao criar sessão:', err);
    if (err.message === 'PACIENTE_NAO_ENCONTRADO') {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    if (err.message === 'PSICOLOGO_NAO_AUTORIZADO') {
      return res.status(403).json({ error: 'Este psicólogo não atende este paciente' });
    }
    res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

sessaoRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar sessão:', err);
    res.status(500).json({ error: 'Erro ao atualizar sessão' });
  }
});

sessaoRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await service.remove(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar sessão:', err);
    res.status(500).json({ error: 'Erro ao deletar sessão' });
  }
});
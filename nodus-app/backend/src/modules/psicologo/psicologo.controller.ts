import { Router, Request, Response } from 'express';
import * as service from './psicologo.service';

export const psicologoRouter = Router();

// Retorna os dados do próprio psicólogo autenticado
psicologoRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const data = await service.getById(req.psicologoId);
    if (!data) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar psicólogo' });
  }
});

psicologoRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (Number(req.params.id) !== req.psicologoId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const data = await service.getById(req.psicologoId);
    if (!data) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar psicólogo' });
  }
});

psicologoRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (Number(req.params.id) !== req.psicologoId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const data = await service.update(req.psicologoId, req.body);
    if (!data) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar psicólogo' });
  }
});

psicologoRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (Number(req.params.id) !== req.psicologoId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const deleted = await service.remove(req.psicologoId);
    if (!deleted) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.status(204).send();
  } catch (err: unknown) {
    console.error('Erro ao deletar psicólogo:', err);
    if (err instanceof Error && err.message === 'PSICOLOGO_TEM_PACIENTES') {
      return res.status(409).json({
        error: 'Não é possível deletar um psicólogo com pacientes vinculados',
      });
    }
    res.status(500).json({ error: 'Erro ao deletar psicólogo' });
  }
});

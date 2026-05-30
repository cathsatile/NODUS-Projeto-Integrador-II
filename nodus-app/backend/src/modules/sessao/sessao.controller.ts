import { Router, Request, Response } from 'express';
import * as service from './sessao.service';
import { findById as findPacienteById } from '../paciente/paciente.repository';

export const sessaoRouter = Router();

// Retorna apenas as sessões do psicólogo autenticado
sessaoRouter.get('/', async (req: Request, res: Response) => {
  try {
    const data = await service.getByPsicologo(req.psicologoId);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessões:', err);
    res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

// Valida que o paciente pertence ao psicólogo autenticado antes de retornar as sessões
sessaoRouter.get('/paciente/:id_paciente', async (req: Request, res: Response) => {
  try {
    const paciente = await findPacienteById(Number(req.params.id_paciente));
    if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });
    if (paciente.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    const data = await service.getByPaciente(Number(req.params.id_paciente));
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessões do paciente:', err);
    res.status(500).json({ error: 'Erro ao buscar sessões do paciente' });
  }
});

// Mantido por compatibilidade — valida que o id da rota pertence ao token
sessaoRouter.get('/psicologo/:id_psicologo', async (req: Request, res: Response) => {
  try {
    if (Number(req.params.id_psicologo) !== req.psicologoId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const data = await service.getByPsicologo(req.psicologoId);
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
    if (data.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar sessão:', err);
    res.status(500).json({ error: 'Erro ao buscar sessão' });
  }
});

// id_psicologo do body é ignorado — sempre usa o do token
sessaoRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = await service.create({ ...req.body, id_psicologo: req.psicologoId });
    res.status(201).json(data);
  } catch (err: unknown) {
    console.error('Erro ao criar sessão:', err);
    if (err instanceof Error && err.message === 'PACIENTE_NAO_ENCONTRADO') {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    if (err instanceof Error && err.message === 'PSICOLOGO_NAO_AUTORIZADO') {
      return res.status(403).json({ error: 'Este psicólogo não atende este paciente' });
    }
    res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

sessaoRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const existente = await service.getById(Number(req.params.id));
    if (!existente) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (existente.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    const data = await service.update(Number(req.params.id), req.body);
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar sessão:', err);
    res.status(500).json({ error: 'Erro ao atualizar sessão' });
  }
});

sessaoRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existente = await service.getById(Number(req.params.id));
    if (!existente) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (existente.id_psicologo !== req.psicologoId) return res.status(403).json({ error: 'Acesso negado' });
    await service.remove(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar sessão:', err);
    res.status(500).json({ error: 'Erro ao deletar sessão' });
  }
});

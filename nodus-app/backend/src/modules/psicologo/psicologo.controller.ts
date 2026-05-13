/*
feito com ajuda do claude principalmente no quesito de assincronia
esse arquivo serve pra receber as requisições e devolver respostas. É um grande porteiro. Repare que tá tudo em trycatch
status HTTP que tão sendo usados:
|CÓD. ||              SIGNIFICADO              |
|200  -- OK (padrão)                           |
|201  -- Criado com sucesso                    |
|204  -- Sucesso sem conteúdo (usado no DELETE)|
|404  -- Não encontrado                        |
|500  -- Erro interno do servidor              |
*/

import { Router, Request, Response } from 'express';
import * as service from './psicologo.service';

export const psicologoRouter = Router();

psicologoRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await service.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar psicólogos' });
  }
});

psicologoRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar psicólogo' });
  }
});

psicologoRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar psicologo:', err);
    res.status(500).json({ error: 'Erro ao criar psicólogo', detail: String(err) });
  }
});

psicologoRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar psicólogo' });
  }
});

psicologoRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await service.remove(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.status(204).send();
  } catch (err: any) {
    console.error('Erro ao deletar psicólogo:', err);
    if (err.message === 'PSICOLOGO_TEM_PACIENTES') {
      return res.status(409).json({
        error: 'Não é possível deletar um psicólogo com pacientes vinculados'
      });
    }
    res.status(500).json({ error: 'Erro ao deletar psicólogo' });
  }
});
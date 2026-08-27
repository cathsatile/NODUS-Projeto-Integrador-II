import { EMOCOES, STATUS_SESSAO, emocaoEmoji, emocaoLabel, statusLabel } from './emocoes';

describe('emocoes', () => {
  describe('EMOCOES', () => {
    it('tem exatamente 11 emoções', () => {
      expect(EMOCOES.length).toBe(11);
    });

    it('valores são únicos de 1 a 11', () => {
      const valores = EMOCOES.map(e => e.valor);
      expect(new Set(valores).size).toBe(11);
      expect(Math.min(...valores)).toBe(1);
      expect(Math.max(...valores)).toBe(11);
    });

    it('todas têm label e emoji não-vazios', () => {
      for (const e of EMOCOES) {
        expect(e.label.length).toBeGreaterThan(0);
        expect(e.emoji.length).toBeGreaterThan(0);
      }
    });
  });

  describe('emocaoLabel', () => {
    it('retorna label para cada valor válido', () => {
      for (const e of EMOCOES) {
        expect(emocaoLabel(e.valor)).toBe(e.label);
      }
    });

    it('retorna "—" para undefined', () => {
      expect(emocaoLabel(undefined)).toBe('—');
    });

    it('retorna o número como string para valor fora do intervalo', () => {
      expect(emocaoLabel(0)).toBe('0');
      expect(emocaoLabel(99)).toBe('99');
    });

    it('casos nominais conhecidos', () => {
      expect(emocaoLabel(1)).toBe('Alegre');
      expect(emocaoLabel(11)).toBe('Triste');
    });
  });

  describe('emocaoEmoji', () => {
    it('retorna emoji para cada valor válido', () => {
      for (const e of EMOCOES) {
        expect(emocaoEmoji(e.valor)).toBe(e.emoji);
      }
    });

    it('retorna string vazia para undefined', () => {
      expect(emocaoEmoji(undefined)).toBe('');
    });

    it('retorna string vazia para valor fora do intervalo', () => {
      expect(emocaoEmoji(0)).toBe('');
      expect(emocaoEmoji(99)).toBe('');
    });

    it('casos nominais conhecidos', () => {
      expect(emocaoEmoji(1)).toBe('😊');
      expect(emocaoEmoji(11)).toBe('😢');
    });
  });

  describe('STATUS_SESSAO', () => {
    it('tem exatamente 5 status', () => {
      expect(STATUS_SESSAO.length).toBe(5);
    });

    it('contém todos os valores esperados', () => {
      const valores = STATUS_SESSAO.map(s => s.valor);
      expect(valores).toContain('realizada');
      expect(valores).toContain('cancelada_paciente');
      expect(valores).toContain('cancelada_psicologo');
      expect(valores).toContain('nao_compareceu');
      expect(valores).toContain('remarcada');
    });
  });

  describe('statusLabel', () => {
    it('retorna label para cada status válido', () => {
      for (const s of STATUS_SESSAO) {
        expect(statusLabel(s.valor)).toBe(s.label);
      }
    });

    it('retorna string vazia para undefined', () => {
      expect(statusLabel(undefined)).toBe('');
    });

    it('retorna o próprio valor para status desconhecido', () => {
      expect(statusLabel('outro')).toBe('outro');
    });

    it('casos nominais conhecidos', () => {
      expect(statusLabel('realizada')).toBe('Sessão realizada');
      expect(statusLabel('nao_compareceu')).toBe('Paciente não compareceu');
    });
  });
});

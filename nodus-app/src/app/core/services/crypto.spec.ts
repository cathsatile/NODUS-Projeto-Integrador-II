import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto';

describe('CryptoService', () => {
  let service: CryptoService;
  const CHAVE = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  describe('encrypt', () => {
    it('retorna string diferente do input original', () => {
      const resultado = service.encrypt('texto clínico sensível', CHAVE);
      expect(resultado).not.toBe('texto clínico sensível');
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('gera ciphertexts diferentes para a mesma entrada (IV aleatório)', () => {
      const c1 = service.encrypt('mesmo texto', CHAVE);
      const c2 = service.encrypt('mesmo texto', CHAVE);
      expect(c1).not.toBe(c2);
    });

    it('criptografa strings vazias sem lançar erro', () => {
      expect(() => service.encrypt('', CHAVE)).not.toThrow();
    });
  });

  describe('decrypt', () => {
    it('recupera o texto original após encrypt', () => {
      const original = 'observação clínica: paciente apresentou melhora';
      const cifrado = service.encrypt(original, CHAVE);
      expect(service.decrypt(cifrado, CHAVE)).toBe(original);
    });

    it('preserva caracteres especiais e acentos após round-trip', () => {
      const original = 'João é psicólogo — notas: "atenção, revisão"';
      const cifrado = service.encrypt(original, CHAVE);
      expect(service.decrypt(cifrado, CHAVE)).toBe(original);
    });

    it('lança erro ao decifrar com chave incorreta', () => {
      const cifrado = service.encrypt('dado sensível', CHAVE);
      expect(() => service.decrypt(cifrado, 'chave-completamente-errada')).toThrow(
        'Falha ao decifrar: chave incorreta ou dado corrompido'
      );
    });

    it('lança erro ao decifrar ciphertext inválido (texto plano)', () => {
      expect(() => service.decrypt('isso não é um ciphertext', CHAVE)).toThrow();
    });

    it('lança erro ao decifrar string vazia', () => {
      expect(() => service.decrypt('', CHAVE)).toThrow();
    });

    it('lança erro ao decifrar ciphertext truncado', () => {
      const cifrado = service.encrypt('texto', CHAVE);
      const truncado = cifrado.slice(0, 10);
      expect(() => service.decrypt(truncado, CHAVE)).toThrow();
    });
  });

  describe('encrypt → decrypt com diferentes tipos de dado', () => {
    const casos = [
      { label: 'nome de paciente', valor: 'Maria das Graças Oliveira' },
      { label: 'email',            valor: 'maria.gracas@email.com' },
      { label: 'data nascimento',  valor: '1985-03-22' },
      { label: 'nota longa',       valor: 'Sessão produtiva. Paciente relatou melhora significativa nos sintomas de ansiedade. Exercícios de respiração foram praticados.' },
    ];

    for (const { label, valor } of casos) {
      it(`round-trip correto para: ${label}`, () => {
        const cifrado = service.encrypt(valor, CHAVE);
        expect(service.decrypt(cifrado, CHAVE)).toBe(valor);
      });
    }
  });
});

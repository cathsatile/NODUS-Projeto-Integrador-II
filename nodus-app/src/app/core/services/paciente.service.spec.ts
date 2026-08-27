import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { PacienteService } from './paciente.service';
import { Paciente, CriarPacienteDto } from './paciente.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/pacientes`;

const CHAVE = 'chave-de-teste-256bit';

// Prefixo simples para distinguir texto cifrado de texto plano nos asserts
const enc = (t: string) => `ENC:${t}`;
const dec = (t: string) => t.replace(/^ENC:/, '');

const PACIENTE_PLAIN: Paciente = {
  id_paciente: 1,
  nome: 'João Silva',
  email: 'joao@email.com',
  data_nascimento: '1990-05-15',
  id_psicologo: 5,
};

const PACIENTE_CIFRADO: Paciente = {
  ...PACIENTE_PLAIN,
  nome: enc(PACIENTE_PLAIN.nome),
  email: enc(PACIENTE_PLAIN.email),
  data_nascimento: enc(PACIENTE_PLAIN.data_nascimento),
};

describe('PacienteService', () => {
  let service: PacienteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { chaveCripto: signal<string | null>(CHAVE) },
        },
        {
          provide: CryptoService,
          useValue: {
            encrypt: (text: string) => enc(text),
            decrypt: (text: string) => dec(text),
          },
        },
      ],
    });
    service = TestBed.inject(PacienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('faz GET /pacientes e atualiza signal com dados decifrados', () => {
      service.getAll().subscribe();
      httpMock.expectOne(API).flush([PACIENTE_CIFRADO]);
      expect(service.pacientes()).toEqual([PACIENTE_PLAIN]);
    });

    it('sinal começa vazio e é preenchido após a resposta', () => {
      expect(service.pacientes()).toEqual([]);
      service.getAll().subscribe();
      httpMock.expectOne(API).flush([PACIENTE_CIFRADO]);
      expect(service.pacientes().length).toBe(1);
    });
  });

  describe('getById', () => {
    it('faz GET /pacientes/:id e retorna o paciente', () => {
      let resultado: Paciente | undefined;
      service.getById(1).subscribe(p => (resultado = p));
      httpMock.expectOne(`${API}/1`).flush(PACIENTE_CIFRADO);
      expect(resultado).toEqual(PACIENTE_CIFRADO);
    });
  });

  describe('getByPsicologo', () => {
    it('faz GET /pacientes/psicologo/:id e atualiza signal com dados decifrados', () => {
      service.getByPsicologo(5).subscribe();
      httpMock.expectOne(`${API}/psicologo/5`).flush([PACIENTE_CIFRADO]);
      expect(service.pacientes()).toEqual([PACIENTE_PLAIN]);
    });
  });

  describe('create', () => {
    it('envia body cifrado e adiciona paciente decifrado ao signal', () => {
      const dto: CriarPacienteDto = {
        nome: PACIENTE_PLAIN.nome,
        email: PACIENTE_PLAIN.email,
        data_nascimento: PACIENTE_PLAIN.data_nascimento,
        id_psicologo: PACIENTE_PLAIN.id_psicologo,
      };

      service.create(dto).subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.nome).toBe(enc(dto.nome));
      expect(req.request.body.email).toBe(enc(dto.email));
      expect(req.request.body.data_nascimento).toBe(enc(dto.data_nascimento));

      req.flush(PACIENTE_CIFRADO);

      expect(service.pacientes()[0].nome).toBe(PACIENTE_PLAIN.nome);
    });

    it('paciente decifrado é acrescentado ao signal (não substitui)', () => {
      const outro: Paciente = { ...PACIENTE_PLAIN, id_paciente: 99, nome: enc('Maria'), email: enc('m@m.com'), data_nascimento: enc('2000-01-01') };
      service.pacientes.set([{ ...outro, nome: dec(outro.nome), email: dec(outro.email), data_nascimento: dec(outro.data_nascimento) }]);

      service.create({ nome: PACIENTE_PLAIN.nome, email: PACIENTE_PLAIN.email, data_nascimento: PACIENTE_PLAIN.data_nascimento, id_psicologo: 5 }).subscribe();
      httpMock.expectOne(API).flush(PACIENTE_CIFRADO);

      expect(service.pacientes().length).toBe(2);
    });
  });

  describe('update', () => {
    it('envia body cifrado e substitui o paciente no signal', () => {
      service.pacientes.set([PACIENTE_PLAIN]);

      service.update(1, { nome: 'Novo Nome' }).subscribe();

      const req = httpMock.expectOne(`${API}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.nome).toBe(enc('Novo Nome'));

      const atualizado: Paciente = { ...PACIENTE_CIFRADO, nome: enc('Novo Nome') };
      req.flush(atualizado);

      expect(service.pacientes().length).toBe(1);
      expect(service.pacientes()[0].nome).toBe('Novo Nome');
    });
  });

  describe('delete', () => {
    it('faz DELETE /pacientes/:id e remove do signal', () => {
      service.pacientes.set([PACIENTE_PLAIN]);

      service.delete(1).subscribe();
      httpMock.expectOne(`${API}/1`).flush(null);

      expect(service.pacientes()).toEqual([]);
    });

    it('remove apenas o paciente correto quando há múltiplos', () => {
      const outro: Paciente = { ...PACIENTE_PLAIN, id_paciente: 2, nome: 'Maria' };
      service.pacientes.set([PACIENTE_PLAIN, outro]);

      service.delete(1).subscribe();
      httpMock.expectOne(`${API}/1`).flush(null);

      expect(service.pacientes().length).toBe(1);
      expect(service.pacientes()[0].id_paciente).toBe(2);
    });
  });

  describe('sem chave de criptografia', () => {
    it('retorna dados brutos quando chaveCripto é null', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: AuthService, useValue: { chaveCripto: signal<string | null>(null) } },
          { provide: CryptoService, useValue: { encrypt: (t: string) => t, decrypt: (t: string) => t } },
        ],
      });
      const svc = TestBed.inject(PacienteService);
      const hm = TestBed.inject(HttpTestingController);

      svc.getAll().subscribe();
      hm.expectOne(API).flush([PACIENTE_CIFRADO]);
      hm.verify();

      // Sem chave, os dados são retornados sem decifrar (ainda cifrados como vieram da API)
      expect(svc.pacientes()[0].nome).toBe(PACIENTE_CIFRADO.nome);
    });
  });
});

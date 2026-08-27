import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { SessaoService } from './sessao.service';
import { Sessao, CriarSessaoDto } from './sessao.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/sessoes`;
const CHAVE = 'chave-de-teste-256bit';

const enc = (t: string) => `ENC:${t}`;
const dec = (t: string) => t.replace(/^ENC:/, '');

const SESSAO_PLAIN: Sessao = {
  id_sessao: 10,
  data: '2026-08-01T14:00:00.000Z',
  horario: '14:00',
  observacoes: 'Paciente relatou melhora.',
  humor: 1,
  status: 'realizada',
  id_paciente: 3,
  id_psicologo: 5,
};

const SESSAO_CIFRADA: Sessao = {
  ...SESSAO_PLAIN,
  observacoes: enc(SESSAO_PLAIN.observacoes!),
};

describe('SessaoService', () => {
  let service: SessaoService;
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
    service = TestBed.inject(SessaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('faz GET /sessoes e atualiza signal com observacoes decifradas', () => {
      service.getAll().subscribe();
      httpMock.expectOne(API).flush([SESSAO_CIFRADA]);
      expect(service.sessoes()).toEqual([SESSAO_PLAIN]);
    });

    it('signal começa vazio', () => {
      expect(service.sessoes()).toEqual([]);
    });
  });

  describe('getById', () => {
    it('faz GET /sessoes/:id e retorna a sessão (sem decifrar no signal)', () => {
      let resultado: Sessao | undefined;
      service.getById(10).subscribe(s => (resultado = s));
      httpMock.expectOne(`${API}/10`).flush(SESSAO_CIFRADA);
      expect(resultado).toEqual(SESSAO_CIFRADA);
    });
  });

  describe('getByPaciente', () => {
    it('faz GET /sessoes/paciente/:id e atualiza signal com observacoes decifradas', () => {
      service.getByPaciente(3).subscribe();
      httpMock.expectOne(`${API}/paciente/3`).flush([SESSAO_CIFRADA]);
      expect(service.sessoes()).toEqual([SESSAO_PLAIN]);
    });
  });

  describe('getByPsicologo', () => {
    it('faz GET /sessoes/psicologo/:id e atualiza signal com observacoes decifradas', () => {
      service.getByPsicologo(5).subscribe();
      httpMock.expectOne(`${API}/psicologo/5`).flush([SESSAO_CIFRADA]);
      expect(service.sessoes()).toEqual([SESSAO_PLAIN]);
    });
  });

  describe('create', () => {
    it('envia body com observacoes cifradas e adiciona sessão decifrada ao signal', () => {
      const dto: CriarSessaoDto = {
        data: SESSAO_PLAIN.data,
        horario: SESSAO_PLAIN.horario,
        observacoes: SESSAO_PLAIN.observacoes,
        id_paciente: SESSAO_PLAIN.id_paciente,
        id_psicologo: SESSAO_PLAIN.id_psicologo,
      };

      service.create(dto).subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.observacoes).toBe(enc(dto.observacoes!));

      req.flush(SESSAO_CIFRADA);

      expect(service.sessoes().length).toBe(1);
      expect(service.sessoes()[0].observacoes).toBe(SESSAO_PLAIN.observacoes);
    });

    it('não cifra quando observacoes está ausente', () => {
      const dto: CriarSessaoDto = {
        data: SESSAO_PLAIN.data,
        horario: SESSAO_PLAIN.horario,
        id_paciente: SESSAO_PLAIN.id_paciente,
        id_psicologo: SESSAO_PLAIN.id_psicologo,
      };

      service.create(dto).subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.body.observacoes).toBeUndefined();
      req.flush({ ...SESSAO_CIFRADA, observacoes: undefined });

      expect(service.sessoes()[0].observacoes).toBeUndefined();
    });

    it('acrescenta ao signal sem substituir entradas existentes', () => {
      service.sessoes.set([SESSAO_PLAIN]);

      const dto: CriarSessaoDto = {
        data: '2026-09-01T10:00:00.000Z',
        horario: '10:00',
        id_paciente: 3,
        id_psicologo: 5,
      };
      service.create(dto).subscribe();
      httpMock.expectOne(API).flush({ ...SESSAO_CIFRADA, id_sessao: 99, data: dto.data });

      expect(service.sessoes().length).toBe(2);
    });
  });

  describe('update', () => {
    it('envia observacoes cifradas e substitui a sessão no signal', () => {
      service.sessoes.set([SESSAO_PLAIN]);

      service.update(10, { status: 'cancelada_paciente', observacoes: 'Nova nota.' }).subscribe();

      const req = httpMock.expectOne(`${API}/10`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.observacoes).toBe(enc('Nova nota.'));

      const atualizada: Sessao = { ...SESSAO_CIFRADA, status: 'cancelada_paciente', observacoes: enc('Nova nota.') };
      req.flush(atualizada);

      const sessaoAtualizada = service.sessoes().find(s => s.id_sessao === 10);
      expect(sessaoAtualizada?.status).toBe('cancelada_paciente');
      expect(sessaoAtualizada?.observacoes).toBe('Nova nota.');
    });

    it('não cifra quando observacoes não está no patch', () => {
      service.sessoes.set([SESSAO_PLAIN]);

      service.update(10, { status: 'remarcada' }).subscribe();

      const req = httpMock.expectOne(`${API}/10`);
      expect(req.request.body.observacoes).toBeUndefined();
      req.flush({ ...SESSAO_CIFRADA, status: 'remarcada' });

      expect(service.sessoes()[0].status).toBe('remarcada');
    });
  });

  describe('delete', () => {
    it('faz DELETE /sessoes/:id e remove do signal', () => {
      service.sessoes.set([SESSAO_PLAIN]);

      service.delete(10).subscribe();
      httpMock.expectOne(`${API}/10`).flush(null);

      expect(service.sessoes()).toEqual([]);
    });

    it('remove apenas a sessão correta', () => {
      const outra: Sessao = { ...SESSAO_PLAIN, id_sessao: 99 };
      service.sessoes.set([SESSAO_PLAIN, outra]);

      service.delete(10).subscribe();
      httpMock.expectOne(`${API}/10`).flush(null);

      expect(service.sessoes().length).toBe(1);
      expect(service.sessoes()[0].id_sessao).toBe(99);
    });
  });

  describe('decifrarObservacoes com erro', () => {
    it('retorna [não foi possível decifrar] quando decrypt lança exceção', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: AuthService, useValue: { chaveCripto: signal<string | null>(CHAVE) } },
          {
            provide: CryptoService,
            useValue: { encrypt: (t: string) => t, decrypt: () => { throw new Error('falha'); } },
          },
        ],
      });
      const svc = TestBed.inject(SessaoService);
      const hm = TestBed.inject(HttpTestingController);

      svc.getAll().subscribe();
      hm.expectOne(API).flush([SESSAO_CIFRADA]);
      hm.verify();

      expect(svc.sessoes()[0].observacoes).toBe('[não foi possível decifrar]');
    });
  });
});

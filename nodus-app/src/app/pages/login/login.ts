import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, CriarPsicologoDto } from '../../core/auth/auth.service';
import { GoogleDriveService, DriveFile } from '../../core/services/google-drive.service';
import { BackupService, BackupData, EncryptedBackup, LocalBackupInfo } from '../../core/services/backup.service';

function senhasIguaisValidator(form: AbstractControl): ValidationErrors | null {
  const senha = form.get('senha')?.value as string;
  const confirmar = form.get('confirmar_senha')?.value as string;
  return senha === confirmar ? null : { senhaDiferente: true };
}

interface CadastroFormValue {
  nome: string;
  email: string;
  registro_profissional: string;
  telefone: string;
  senha: string;
  confirmar_senha: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  tipoBotao: 'inicial' | 'cadastro' | 'login' | 'restaurar' | 'restaurar-senha' | 'desbloquear' = 'inicial';

  readonly loading = signal(false);
  readonly erro = signal('');
  readonly erroRestauro = signal('');

  private authService = inject(AuthService);
  private router = inject(Router);
  private googleDrive = inject(GoogleDriveService);
  private backupService = inject(BackupService);
  private fb = inject(FormBuilder);

  readonly psicologo = this.authService.psicologoAtual;
  readonly iniciais = computed(() => {
    const p = this.psicologo();
    if (!p) return '';
    return p.nome.split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  });

  readonly isNative = this.backupService.isNative;

  // Estado do fluxo de restauração
  readonly backupCarregado = signal<EncryptedBackup | null>(null);
  readonly backupsDrive = signal<DriveFile[]>([]);
  readonly carregandoDrive = signal(false);
  readonly backupsLocais = signal<LocalBackupInfo[]>([]);
  readonly carregandoLocais = signal(false);

  // Dados decriptografados aguardando importação após login
  _backupParaImportar: BackupData | null = null;

  loginForm: FormGroup;
  cadastroForm: FormGroup;
  desbloquearForm: FormGroup;
  restaurarSenhaForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.cadastroForm = this.fb.group(
      {
        nome: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        registro_profissional: ['', Validators.required],
        telefone: [''],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmar_senha: ['', Validators.required],
      },
      { validators: senhasIguaisValidator }
    );

    this.desbloquearForm = this.fb.group({
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.restaurarSenhaForm = this.fb.group({
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    if (this.authService.precisaDesbloquear()) {
      this.tipoBotao = 'desbloquear';
    }
  }

  // ─── Tela inicial ─────────────────────────────────────────────────────────

  primeiraVez(): void {
    this.tipoBotao = 'cadastro';
    this.erro.set('');
  }

  naoEPrimeiraVez(): void {
    this.tipoBotao = 'restaurar';
    this.erroRestauro.set('');
    this.backupsDrive.set([]);
    if (this.isNative) void this.carregarBackupsLocais();
  }

  async carregarBackupsLocais(): Promise<void> {
    this.carregandoLocais.set(true);
    try {
      const lista = await this.backupService.listarBackupsLocais();
      this.backupsLocais.set(lista);
    } catch {
      this.backupsLocais.set([]);
    } finally {
      this.carregandoLocais.set(false);
    }
  }

  async selecionarBackupLocal(info: LocalBackupInfo): Promise<void> {
    this.erroRestauro.set('');
    this.loading.set(true);
    try {
      const backup = await this.backupService.carregarBackupLocal(info.path);
      this.backupCarregado.set(backup);
      this.tipoBotao = 'restaurar-senha';
    } catch (err) {
      this.erroRestauro.set(err instanceof Error ? err.message : 'Erro ao carregar backup.');
    } finally {
      this.loading.set(false);
    }
  }

  voltarParaInicial(): void {
    this.tipoBotao = 'inicial';
    this.erro.set('');
    this.erroRestauro.set('');
  }

  // ─── Desbloqueio (retorno ao app) ─────────────────────────────────────────

  async desbloquear(): Promise<void> {
    if (this.desbloquearForm.invalid) {
      this.desbloquearForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erro.set('');

    const { senha } = this.desbloquearForm.value as { senha: string };
    const sucesso = await this.authService.desbloquear(senha);

    this.loading.set(false);
    if (sucesso) {
      void this.router.navigate(['/principal/home']);
    } else {
      this.erro.set('Senha incorreta.');
    }
  }

  trocarConta(): void {
    this.authService.limparConta();
    this.tipoBotao = 'inicial';
    this.erro.set('');
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  fazerLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erro.set('');

    const { email, senha } = this.loginForm.value as { email: string; senha: string };
    this.authService.login(email, senha).subscribe({
      next: async () => {
        this.loading.set(false);
        // Se veio de uma restauração, importa os dados agora que temos o id_psicologo
        if (this._backupParaImportar) {
          const psi = this.authService.psicologoAtual();
          if (psi) {
            try {
              await this.backupService.importar(this._backupParaImportar, psi.id_psicologo);
            } catch { /* navega mesmo em caso de falha na importação */ }
          }
          this._backupParaImportar = null;
        }
        await this.router.navigate(['/principal/home']);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(
          err.status === 401
            ? 'Email ou senha incorretos.'
            : 'Erro ao fazer login. Tente novamente.'
        );
        this.loading.set(false);
      },
    });
  }

  irParaLogin(): void {
    this.tipoBotao = 'login';
    this.erro.set('');
  }

  // ─── Cadastro ────────────────────────────────────────────────────────────

  fazerCadastro(): void {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erro.set('');

    const formVal = this.cadastroForm.value as CadastroFormValue;
    const data: CriarPsicologoDto = {
      nome: formVal.nome,
      email: formVal.email,
      senha: formVal.senha,
      registro_profissional: formVal.registro_profissional,
      ...(formVal.telefone ? { telefone: formVal.telefone } : {}),
    };

    this.authService.register(data).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/principal/home']);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(
          err.status === 409
            ? 'Este email já está cadastrado.'
            : 'Erro ao criar conta. Tente novamente.'
        );
        this.loading.set(false);
      },
    });
  }

  // ─── Restauração de backup ────────────────────────────────────────────────

  semBackup(): void {
    this.tipoBotao = 'cadastro';
    this.erroRestauro.set('');
  }

  async restaurarComDrive(): Promise<void> {
    this.carregandoDrive.set(true);
    this.erroRestauro.set('');
    try {
      if (!this.googleDrive.conectado()) {
        await this.googleDrive.conectar();
      }
      const lista = await this.googleDrive.listarBackups();
      this.backupsDrive.set(lista);
      if (lista.length === 0) {
        this.erroRestauro.set('Nenhum backup encontrado nesta conta Google.');
      }
    } catch (err) {
      this.erroRestauro.set(err instanceof Error ? err.message : 'Falha ao acessar o Drive.');
    } finally {
      this.carregandoDrive.set(false);
    }
  }

  async selecionarBackupDrive(arquivo: DriveFile): Promise<void> {
    this.carregandoDrive.set(true);
    this.erroRestauro.set('');
    try {
      const backup = await this.googleDrive.baixarBackup(arquivo.id);
      this.backupCarregado.set(backup);
      this.tipoBotao = 'restaurar-senha';
    } catch (err) {
      this.erroRestauro.set(err instanceof Error ? err.message : 'Erro ao baixar backup.');
    } finally {
      this.carregandoDrive.set(false);
    }
  }

  async onFileParaRestauro(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.erroRestauro.set('');
    this.loading.set(true);
    try {
      const backup = await this.backupService.carregarArquivo(file);
      this.backupCarregado.set(backup);
      this.tipoBotao = 'restaurar-senha';
    } catch (err) {
      this.erroRestauro.set(err instanceof Error ? err.message : 'Arquivo inválido.');
    } finally {
      this.loading.set(false);
      input.value = '';
    }
  }

  async confirmarRestauro(): Promise<void> {
    if (this.restaurarSenhaForm.invalid) {
      this.restaurarSenhaForm.markAllAsTouched();
      return;
    }
    const backup = this.backupCarregado();
    if (!backup) return;

    this.loading.set(true);
    this.erroRestauro.set('');

    const { senha } = this.restaurarSenhaForm.value as { senha: string };
    try {
      // Deriva a mesma chave que será usada após o login — sem precisar de rede
      const chave = await this.authService.derivarChaveAsync(senha, backup.psicologo_email);
      const data = this.backupService.descriptografarBackup(backup, chave);

      // Guarda os dados; serão importados para o Dexie após o login bem-sucedido
      this._backupParaImportar = data;

      // Pré-preenche email e redireciona para login
      this.loginForm.patchValue({ email: backup.psicologo_email });
      this.backupCarregado.set(null);
      this.restaurarSenhaForm.reset();
      this.tipoBotao = 'login';
    } catch {
      this.erroRestauro.set('Senha incorreta. Use a senha da sua conta NODUS.');
    } finally {
      this.loading.set(false);
    }
  }

  voltarParaRestauro(): void {
    this.tipoBotao = 'restaurar';
    this.backupCarregado.set(null);
    this.erroRestauro.set('');
    this.restaurarSenhaForm.reset();
  }

  formatarData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR');
  }
}

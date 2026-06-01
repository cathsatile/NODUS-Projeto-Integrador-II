import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackupService, EncryptedBackup, ImportResult } from '../../core/services/backup.service';
import { GoogleDriveService, DriveFile } from '../../core/services/google-drive.service';
import { AuthService } from '../../core/auth/auth.service';

type Aba = 'exportar' | 'importar';
type Estado = 'idle' | 'carregando' | 'sucesso' | 'erro';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './backup.html',
  styleUrl: './backup.scss',
})
export class BackupPage {
  private backupService = inject(BackupService);
  private driveService = inject(GoogleDriveService);
  private authService = inject(AuthService);

  readonly psicologo = this.authService.psicologoAtual;
  readonly driveConectado = this.driveService.conectado;

  readonly abaAtiva = signal<Aba>('exportar');
  readonly estado = signal<Estado>('idle');
  readonly mensagem = signal('');

  // Estado de exportação
  readonly enviandoDrive = signal(false);

  // Estado de importação
  readonly backupPendente = signal<EncryptedBackup | null>(null);
  readonly resultadoImport = signal<ImportResult | null>(null);
  readonly backupsDrive = signal<DriveFile[]>([]);
  readonly carregandoBackupsDrive = signal(false);
  readonly backupDriveSelecionado = signal<DriveFile | null>(null);
  readonly confirmandoRestauracao = signal(false);

  readonly temBackupPendente = computed(() => !!this.backupPendente());
  readonly nomeArquivoPendente = computed(() => {
    const b = this.backupPendente();
    if (!b) return '';
    return new Date(b.timestamp).toLocaleString('pt-BR');
  });

  setAba(aba: Aba): void {
    this.abaAtiva.set(aba);
    this.resetarEstado();
  }

  // ─── Exportar ────────────────────────────────────────────────────────────────

  async exportarLocal(): Promise<void> {
    const chave = this.authService.chaveCripto();
    const psi = this.psicologo();
    if (!chave || !psi) {
      this.setErro('Sessão inativa. Faça login novamente.');
      return;
    }

    this.estado.set('carregando');
    try {
      const data = await this.backupService.exportar();
      const backup = this.backupService.criptografarBackup(data, chave, psi.email);
      this.backupService.baixarArquivo(backup);
      this.setMensagem('sucesso', `Backup criado com ${data.pacientes.length} pacientes e ${data.sessoes.length} sessões.`);
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Erro ao criar backup.');
    }
  }

  async conectarGoogle(): Promise<void> {
    this.estado.set('carregando');
    try {
      await this.driveService.conectar();
      this.setMensagem('sucesso', 'Conectado ao Google com sucesso.');
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Falha na conexão com o Google.');
    }
  }

  desconectarGoogle(): void {
    this.driveService.desconectar();
    this.backupsDrive.set([]);
    this.backupDriveSelecionado.set(null);
    this.resetarEstado();
  }

  async exportarDrive(): Promise<void> {
    const chave = this.authService.chaveCripto();
    const psi = this.psicologo();
    if (!chave || !psi) {
      this.setErro('Sessão inativa.');
      return;
    }

    this.enviandoDrive.set(true);
    this.estado.set('carregando');
    try {
      const data = await this.backupService.exportar();
      const backup = this.backupService.criptografarBackup(data, chave, psi.email);
      await this.driveService.salvarBackup(backup);
      this.setMensagem('sucesso', `Backup salvo no Google Drive com sucesso.`);
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Erro ao salvar no Drive.');
    } finally {
      this.enviandoDrive.set(false);
    }
  }

  // ─── Importar ────────────────────────────────────────────────────────────────

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.resetarEstado();
    this.estado.set('carregando');
    try {
      const backup = await this.backupService.carregarArquivo(file);
      this.backupPendente.set(backup);
      this.estado.set('idle');
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Erro ao ler arquivo.');
    }
    input.value = '';
  }

  async carregarBackupsDrive(): Promise<void> {
    this.carregandoBackupsDrive.set(true);
    try {
      const lista = await this.driveService.listarBackups();
      this.backupsDrive.set(lista);
      if (lista.length === 0) {
        this.setMensagem('idle', 'Nenhum backup encontrado no Drive.');
      }
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Erro ao listar backups.');
    } finally {
      this.carregandoBackupsDrive.set(false);
    }
  }

  async selecionarBackupDrive(arquivo: DriveFile): Promise<void> {
    this.backupPendente.set(null);
    this.estado.set('carregando');
    try {
      const backup = await this.driveService.baixarBackup(arquivo.id);
      this.backupDriveSelecionado.set(arquivo);
      this.backupPendente.set(backup);
      this.estado.set('idle');
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Erro ao baixar backup.');
    }
  }

  iniciarRestauracao(): void {
    this.confirmandoRestauracao.set(true);
  }

  cancelarRestauracao(): void {
    this.confirmandoRestauracao.set(false);
  }

  async confirmarRestauracao(): Promise<void> {
    const backup = this.backupPendente();
    const chave = this.authService.chaveCripto();
    const psi = this.psicologo();

    if (!backup || !chave || !psi) {
      this.setErro('Sessão inativa ou backup não carregado.');
      return;
    }

    this.confirmandoRestauracao.set(false);
    this.estado.set('carregando');
    try {
      const data = this.backupService.descriptografarBackup(backup, chave);
      const resultado = await this.backupService.importar(data, psi.id_psicologo);
      this.resultadoImport.set(resultado);
      this.backupPendente.set(null);
      this.setMensagem(
        'sucesso',
        `Restauração concluída: ${resultado.pacientes} pacientes, ${resultado.sessoes} sessões e ${resultado.humor} registros de humor.`
      );
    } catch (err) {
      this.setErro(err instanceof Error ? err.message : 'Erro ao restaurar backup.');
    }
  }

  limparBackupPendente(): void {
    this.backupPendente.set(null);
    this.backupDriveSelecionado.set(null);
    this.resetarEstado();
  }

  formatarData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR');
  }

  formatarTamanho(bytes?: string): string {
    if (!bytes) return '';
    const n = parseInt(bytes, 10);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private setMensagem(estado: Estado, msg: string): void {
    this.estado.set(estado);
    this.mensagem.set(msg);
  }

  private setErro(msg: string): void {
    this.estado.set('erro');
    this.mensagem.set(msg);
  }

  private resetarEstado(): void {
    this.estado.set('idle');
    this.mensagem.set('');
    this.confirmandoRestauracao.set(false);
  }
}

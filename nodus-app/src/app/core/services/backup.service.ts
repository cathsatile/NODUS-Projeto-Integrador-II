import { Injectable, inject } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { DbService, PacienteLocal, SessaoLocal, HumorLocal } from '../database/db';
import { AuthService } from '../auth/auth.service';

export interface BackupData {
  pacientes: PacienteLocal[];
  sessoes: SessaoLocal[];
  humor: HumorLocal[];
}

// Formato do arquivo .nodus — a chave CryptoJS inclui salt+IV aleatórios no campo `data`
export interface EncryptedBackup {
  version: 1;
  app: 'NODUS';
  timestamp: string;
  schema_version: number;
  psicologo_email: string;
  data: string;
}

export interface ImportResult {
  pacientes: number;
  sessoes: number;
  humor: number;
}

export interface LocalBackupInfo {
  filename: string;
  path: string;
  modifiedAt: string;
}

const BACKUP_DIR = 'backups';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private db = inject(DbService);
  private authService = inject(AuthService);

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async exportar(): Promise<BackupData> {
    const psicologo = this.authService.psicologoAtual();
    if (!psicologo) throw new Error('Sessão inativa. Faça login novamente.');

    const id = psicologo.id_psicologo;
    const [pacientes, sessoes, humor] = await Promise.all([
      this.db.pacientes.where('id_psicologo').equals(id).toArray(),
      this.db.sessoes.where('id_psicologo').equals(id).toArray(),
      this.db.humor.where('id_psicologo').equals(id).toArray(),
    ]);

    return { pacientes, sessoes, humor };
  }

  criptografarBackup(data: BackupData, chaveCripto: string, email: string): EncryptedBackup {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), chaveCripto).toString();
    return {
      version: 1,
      app: 'NODUS',
      timestamp: new Date().toISOString(),
      schema_version: 3,
      psicologo_email: email,
      data: encrypted,
    };
  }

  descriptografarBackup(backup: EncryptedBackup, chaveCripto: string): BackupData {
    if (backup.app !== 'NODUS' || backup.version !== 1) {
      throw new Error('Arquivo inválido: não é um backup NODUS.');
    }

    const bytes = CryptoJS.AES.decrypt(backup.data, chaveCripto);
    const resultado = bytes.toString(CryptoJS.enc.Utf8);

    if (!resultado) {
      throw new Error('Falha ao descriptografar: backup pertence a outro usuário ou conta diferente.');
    }

    return JSON.parse(resultado) as BackupData;
  }

  async importar(data: BackupData, idPsicologoAtual: number): Promise<ImportResult> {
    const pacientes = data.pacientes.map(p => ({ ...p, id: undefined, id_psicologo: idPsicologoAtual }));
    const sessoes = data.sessoes.map(s => ({ ...s, id: undefined, id_psicologo: idPsicologoAtual }));
    const humor = data.humor.map(h => ({ ...h, id: undefined, id_psicologo: idPsicologoAtual }));

    await this.db.transaction('rw', [this.db.pacientes, this.db.sessoes, this.db.humor], async () => {
      await this.db.pacientes.where('id_psicologo').equals(idPsicologoAtual).delete();
      await this.db.sessoes.where('id_psicologo').equals(idPsicologoAtual).delete();
      await this.db.humor.where('id_psicologo').equals(idPsicologoAtual).delete();
      await this.db.pacientes.bulkAdd(pacientes);
      await this.db.sessoes.bulkAdd(sessoes);
      await this.db.humor.bulkAdd(humor);
    });

    return { pacientes: pacientes.length, sessoes: sessoes.length, humor: humor.length };
  }

  // ─── Salvar local (nativo: pasta privada do app | web: download) ──────────

  async salvarLocal(backup: EncryptedBackup): Promise<void> {
    const emailSafe = backup.psicologo_email.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `nodus-backup-${emailSafe}.nodus`;
    const content = JSON.stringify(backup, null, 2);

    if (this.isNative) {
      await this.garantirDiretorio();
      await Filesystem.writeFile({
        path: `${BACKUP_DIR}/${filename}`,
        data: content,
        directory: Directory.External,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } else {
      this.baixarArquivoBrowser(backup);
    }
  }

  // ─── Listar backups locais (apenas nativo) ────────────────────────────────

  async listarBackupsLocais(): Promise<LocalBackupInfo[]> {
    if (!this.isNative) return [];

    await this.garantirDiretorio();

    try {
      const result = await Filesystem.readdir({
        path: BACKUP_DIR,
        directory: Directory.External,
      });

      const infos: LocalBackupInfo[] = [];
      for (const entry of result.files) {
        if (entry.name.endsWith('.nodus')) {
          infos.push({
            filename: entry.name,
            path: `${BACKUP_DIR}/${entry.name}`,
            modifiedAt: entry.mtime ? new Date(entry.mtime).toISOString() : new Date().toISOString(),
          });
        }
      }

      return infos.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    } catch {
      return [];
    }
  }

  // ─── Carregar backup local pelo path (apenas nativo) ─────────────────────

  async carregarBackupLocal(path: string): Promise<EncryptedBackup> {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.External,
      encoding: Encoding.UTF8,
    });

    const parsed = JSON.parse(result.data as string) as EncryptedBackup;
    if (parsed.app !== 'NODUS' || parsed.version !== 1) {
      throw new Error('Arquivo inválido: não é um backup NODUS.');
    }
    return parsed;
  }

  // ─── Carregar backup de File (web / file picker) ──────────────────────────

  carregarArquivo(file: File): Promise<EncryptedBackup> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target!.result as string) as EncryptedBackup;
          if (parsed.app !== 'NODUS' || parsed.version !== 1) {
            reject(new Error('Arquivo inválido: não é um backup NODUS.'));
            return;
          }
          resolve(parsed);
        } catch {
          reject(new Error('Arquivo corrompido ou formato inválido.'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
      reader.readAsText(file);
    });
  }

  // ─── Download browser (fallback web) ─────────────────────────────────────

  private baixarArquivoBrowser(backup: EncryptedBackup): void {
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const emailSafe = backup.psicologo_email.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `nodus-backup-${emailSafe}.nodus`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async garantirDiretorio(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: BACKUP_DIR,
        directory: Directory.External,
        recursive: true,
      });
    } catch {
      // já existe — ok
    }
  }
}

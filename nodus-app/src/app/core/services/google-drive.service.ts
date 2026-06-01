import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EncryptedBackup } from './backup.service';

// Tipos mínimos da Google Identity Services (sem instalar pacote separado)
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GisTokenConfig): GisTokenClient;
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

interface GisTokenConfig {
  client_id: string;
  scope: string;
  callback: (resp: GisTokenResponse) => void;
  error_callback?: (err: GisTokenError) => void;
}

interface GisTokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
}

interface GisTokenError {
  type: string;
  message?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'NODUS Backup';
const DRIVE_V3 = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private _token: string | null = null;
  private _tokenExpires = 0;
  private _folderId: string | null = null;

  // Signal público para a UI reagir ao estado de conexão
  readonly conectado = signal(false);

  // Abre o popup de login Google e obtém o access token via implicit grant.
  // NOTA CAPACITOR: em produção Android, substitua por @codetrix-studio/capacitor-google-auth
  // para autenticação nativa (sem popup WebView).
  conectar(): Promise<void> {
    return this.carregarGIS().then(
      () =>
        new Promise((resolve, reject) => {
          if (!environment.googleClientId) {
            reject(new Error('Google Client ID não configurado. Veja src/environments/environment.ts.'));
            return;
          }

          const client = window.google!.accounts.oauth2.initTokenClient({
            client_id: environment.googleClientId,
            scope: SCOPE,
            callback: (resp) => {
              if (resp.error) {
                reject(new Error(`Erro Google OAuth: ${resp.error}`));
                return;
              }
              this._token = resp.access_token;
              this._tokenExpires = Date.now() + resp.expires_in * 1000 - 60_000;
              this._folderId = null;
              this.conectado.set(true);
              resolve();
            },
            error_callback: (err) => {
              reject(new Error(`Autenticação cancelada: ${err.type}`));
            },
          });

          client.requestAccessToken({ prompt: 'select_account' });
        })
    );
  }

  desconectar(): void {
    if (this._token) {
      window.google?.accounts.oauth2.revoke(this._token, () => {});
    }
    this._token = null;
    this._tokenExpires = 0;
    this._folderId = null;
    this.conectado.set(false);
  }

  async salvarBackup(backup: EncryptedBackup): Promise<string> {
    const token = this.tokenOuErro();
    const folderId = await this.obterOuCriarPasta(token);
    const emailSafe = backup.psicologo_email.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `nodus-backup-${emailSafe}.nodus`;
    const content = JSON.stringify(backup);

    const idExistente = await this.buscarArquivoExistente(token, folderId, filename);

    if (idExistente) {
      // Sobrescreve o conteúdo do arquivo existente via PATCH
      const res = await fetch(`${DRIVE_UPLOAD}/files/${idExistente}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: content,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Falha ao atualizar backup no Drive: ${msg}`);
      }
      return idExistente;
    }

    // Cria o arquivo pela primeira vez
    const metadata = { name: filename, parents: [folderId], mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Falha ao criar backup no Drive: ${msg}`);
    }

    const file = (await res.json()) as { id: string };
    return file.id;
  }

  private async buscarArquivoExistente(token: string, folderId: string, filename: string): Promise<string | null> {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and name='${filename}' and trashed=false`,
      fields: 'files(id)',
    });

    const res = await fetch(`${DRIVE_V3}/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;
    const { files } = (await res.json()) as { files: { id: string }[] };
    return files.length > 0 ? files[0].id : null;
  }

  async listarBackups(): Promise<DriveFile[]> {
    const token = this.tokenOuErro();
    const folderId = await this.obterOuCriarPasta(token);

    const params = new URLSearchParams({
      q: `'${folderId}' in parents and name contains 'nodus-backup-' and trashed=false`,
      fields: 'files(id,name,createdTime,size)',
      orderBy: 'createdTime desc',
      pageSize: '20',
    });

    const res = await fetch(`${DRIVE_V3}/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Falha ao listar backups do Drive.');
    const json = (await res.json()) as { files: DriveFile[] };
    return json.files;
  }

  async baixarBackup(fileId: string): Promise<EncryptedBackup> {
    const token = this.tokenOuErro();

    const res = await fetch(`${DRIVE_V3}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Falha ao baixar backup do Drive.');
    const text = await res.text();
    return JSON.parse(text) as EncryptedBackup;
  }

  private async obterOuCriarPasta(token: string): Promise<string> {
    if (this._folderId) return this._folderId;

    const params = new URLSearchParams({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    const searchRes = await fetch(`${DRIVE_V3}/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!searchRes.ok) throw new Error('Falha ao buscar pasta no Drive.');
    const { files } = (await searchRes.json()) as { files: { id: string }[] };

    if (files.length > 0) {
      this._folderId = files[0].id;
      return this._folderId;
    }

    const createRes = await fetch(`${DRIVE_V3}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });

    if (!createRes.ok) throw new Error('Falha ao criar pasta no Drive.');
    const folder = (await createRes.json()) as { id: string };
    this._folderId = folder.id;
    return this._folderId;
  }

  private carregarGIS(): Promise<void> {
    if (window.google?.accounts) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services. Verifique sua conexão.'));
      document.head.appendChild(script);
    });
  }

  private tokenOuErro(): string {
    if (!this._token || Date.now() > this._tokenExpires) {
      this.conectado.set(false);
      throw new Error('Sessão Google expirada. Conecte-se novamente.');
    }
    return this._token;
  }
}

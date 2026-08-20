import { app, BrowserWindow } from 'electron';
import path from 'path';

// ─── Ambiente do backend ──────────────────────────────────────────────────────
// Definir ANTES de qualquer import do servidor Express para que
// process.env já esteja pronto quando db.ts e server.ts inicializarem.
process.env['DB_PATH']         ??= path.join(app.getPath('userData'), 'nodus.db');
process.env['PORT']            ??= '3000';
process.env['FRONTEND_ORIGIN'] ??= '';   // vazio → CORS aceita origin null (file://)
process.env['JWT_SECRET']      ??= 'nodus-desktop-insecure-default-troque-antes-da-banca';

// ─── Backend Express ──────────────────────────────────────────────────────────
// Em produção o backend é importado no mesmo processo do Electron (Opção A —
// HTTP loopback, conforme PLANO-CONVERSAO-DESKTOP.md § 3.1).
// Em desenvolvimento o backend roda separado via `npm run backend:dev`,
// então Electron apenas aponta a janela para localhost:4200.
if (process.env['NODE_ENV'] !== 'development') {
  // Caminho do server.js compilado: backend/dist/server.js
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'server.js')
    : path.join(__dirname, '..', 'backend', 'dist', 'server.js');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(serverPath);
}

// ─── Janela principal ─────────────────────────────────────────────────────────
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'NODUS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // preload: path.join(__dirname, 'preload.js')  ← reservado para IPC futuro
    },
  });

  if (process.env['NODE_ENV'] === 'development') {
    // Dev: Angular serve em localhost:4200 com hot-reload
    void win.loadURL('http://localhost:4200');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Prod: build estático do Angular gerado por `ng build --configuration=electron`
    void win.loadFile(
      path.join(__dirname, '..', 'dist', 'nodus-app', 'browser', 'index.html'),
    );
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();

  // macOS: reabrir janela ao clicar no dock sem janelas abertas
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

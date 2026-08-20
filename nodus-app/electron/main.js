"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// ─── Ambiente do backend ──────────────────────────────────────────────────────
// Definir ANTES de qualquer import do servidor Express para que
// process.env já esteja pronto quando db.ts e server.ts inicializarem.
(_a = process.env)['DB_PATH'] ?? (_a['DB_PATH'] = path_1.default.join(electron_1.app.getPath('userData'), 'nodus.db'));
(_b = process.env)['PORT'] ?? (_b['PORT'] = '3000');
(_c = process.env)['FRONTEND_ORIGIN'] ?? (_c['FRONTEND_ORIGIN'] = ''); // vazio → CORS aceita origin null (file://)
(_d = process.env)['JWT_SECRET'] ?? (_d['JWT_SECRET'] = 'nodus-desktop-insecure-default-troque-antes-da-banca');
// ─── Backend Express ──────────────────────────────────────────────────────────
// Em produção o backend é importado no mesmo processo do Electron (Opção A —
// HTTP loopback, conforme PLANO-CONVERSAO-DESKTOP.md § 3.1).
// Em desenvolvimento o backend roda separado via `npm run backend:dev`,
// então Electron apenas aponta a janela para localhost:4200.
if (process.env['NODE_ENV'] !== 'development') {
    // Caminho do server.js compilado: backend/dist/server.js
    const serverPath = electron_1.app.isPackaged
        ? path_1.default.join(process.resourcesPath, 'backend', 'dist', 'server.js')
        : path_1.default.join(__dirname, '..', 'backend', 'dist', 'server.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(serverPath);
}
// ─── Janela principal ─────────────────────────────────────────────────────────
function createWindow() {
    const win = new electron_1.BrowserWindow({
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
    }
    else {
        // Prod: build estático do Angular gerado por `ng build --configuration=electron`
        void win.loadFile(path_1.default.join(__dirname, '..', 'dist', 'nodus-app', 'browser', 'index.html'));
    }
    return win;
}
electron_1.app.whenReady().then(() => {
    createWindow();
    // macOS: reabrir janela ao clicar no dock sem janelas abertas
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});

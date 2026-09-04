"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const isProd = electron_1.app.isPackaged;
let backendProcess = null;
let staticServer = null;
const STATIC_ROOT = path.join(__dirname, '..', 'dist', 'nodus-app', 'browser');
const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};
function startStaticServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const reqPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
            let filePath = path.join(STATIC_ROOT, reqPath);
            if (!filePath.startsWith(STATIC_ROOT))
                filePath = STATIC_ROOT;
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                filePath = path.join(STATIC_ROOT, 'index.html');
            }
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}
function startBackend() {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(electron_1.app.getPath('userData'), 'nodus.db');
        const serverScript = isProd
            ? path.join(process.resourcesPath, 'backend', 'dist', 'server.js')
            : path.join(__dirname, '..', 'backend', 'dist', 'server.js');
        backendProcess = (0, child_process_1.spawn)('node', [serverScript], {
            env: {
                ...process.env,
                DB_PATH: dbPath,
                PORT: '3000',
                NODE_ENV: isProd ? 'production' : 'development',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const timeout = setTimeout(() => resolve(), 8000);
        backendProcess.stdout?.on('data', (data) => {
            const msg = data.toString();
            console.log('[backend]', msg.trim());
            if (msg.includes('rodando na porta') || msg.includes('listening')) {
                clearTimeout(timeout);
                resolve();
            }
        });
        backendProcess.stderr?.on('data', (data) => {
            console.error('[backend erro]', data.toString().trim());
        });
        backendProcess.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        backendProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`[backend] processo encerrado com código ${code}`);
            }
        });
    });
}
async function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isProd) {
        staticServer = await startStaticServer();
        const address = staticServer.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        win.loadURL(`http://127.0.0.1:${port}/`);
    }
    else {
        win.loadURL('http://localhost:4200');
        win.webContents.openDevTools();
    }
    win.on('closed', () => {
        staticServer?.close();
        staticServer = null;
    });
}
function killBackend() {
    if (backendProcess && !backendProcess.killed) {
        backendProcess.kill();
        backendProcess = null;
    }
}
electron_1.app.whenReady().then(async () => {
    if (isProd) {
        await startBackend();
    }
    await createWindow();
});
electron_1.app.on('window-all-closed', () => {
    killBackend();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', killBackend);

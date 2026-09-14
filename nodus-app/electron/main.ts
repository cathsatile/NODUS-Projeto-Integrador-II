import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const isProd = app.isPackaged;

let backendProcess: ChildProcess | null = null;
let staticServer: http.Server | null = null;

const STATIC_ROOT = path.join(__dirname, '..', 'dist', 'nodus-app', 'browser');
const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function startStaticServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      let filePath = path.join(STATIC_ROOT, reqPath);
      if (!filePath.startsWith(STATIC_ROOT)) filePath = STATIC_ROOT;
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

function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(app.getPath('userData'), 'nodus.db');

    const serverScript = isProd
      ? path.join(process.resourcesPath, 'backend', 'dist', 'server.js')
      : path.join(__dirname, '..', 'backend', 'dist', 'server.js');

    backendProcess = spawn('node', [serverScript], {
      env: {
        ...process.env,
        DB_PATH: dbPath,
        PORT: '3000',
        NODE_ENV: isProd ? 'production' : 'development',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => resolve(), 8000);

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[backend]', msg.trim());
      if (msg.includes('rodando na porta') || msg.includes('listening')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
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

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
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
  } else {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    staticServer?.close();
    staticServer = null;
  });
}

function killBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

app.whenReady().then(async () => {
  if (isProd) {
    await startBackend();
  }
  await createWindow();
});

app.on('window-all-closed', () => {
  killBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', killBackend);
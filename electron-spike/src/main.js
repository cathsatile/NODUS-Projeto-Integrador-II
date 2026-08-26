const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function runDbSpike() {
  const Database = require('better-sqlite3');
  const dbPath = path.join(app.getPath('userData'), 'nodus-spike.db');

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE paciente (
      id_paciente INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL
    )
  `);

  const insert = db.prepare('INSERT INTO paciente (nome) VALUES (?)');
  insert.run('paciente-teste-1');
  insert.run('paciente-teste-2');

  const rows = db.prepare('SELECT * FROM paciente').all();
  db.close();

  return { dbPath, rows, betterSqlite3Version: require('better-sqlite3/package.json').version };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 400,
    webPreferences: { contextIsolation: true },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.once('did-finish-load', () => {
    let resultHtml;
    try {
      const result = runDbSpike();
      console.log('[spike] better-sqlite3 OK:', JSON.stringify(result));
      resultHtml = `
        <p style="color: green;"><strong>OK</strong> — better-sqlite3 v${result.betterSqlite3Version} funcionando dentro do Electron.</p>
        <p>Banco em: <code>${result.dbPath}</code></p>
        <pre>${JSON.stringify(result.rows, null, 2)}</pre>
      `;
    } catch (err) {
      console.error('[spike] FALHOU:', err);
      resultHtml = `<p style="color: red;"><strong>FALHOU</strong></p><pre>${String(err.stack || err)}</pre>`;
    }
    win.webContents.executeJavaScript(
      `document.getElementById('status').outerHTML = ${JSON.stringify(resultHtml)};`,
    );
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

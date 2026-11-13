const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function startStaticServer(publicDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const safeRel = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, '');
      let candidate = path.join(publicDir, safeRel);
      if (!candidate.startsWith(publicDir)) { res.writeHead(403); res.end('Forbidden'); return; }
      if (!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) candidate = path.join(publicDir, 'index.html');
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(candidate).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: typeof addr === 'object' && addr ? addr.port : 34130 });
    });
    server.on('error', reject);
  });
}

app.whenReady().then(async () => {
  const publicDir = path.join(__dirname, 'public');
  const { port } = await startStaticServer(publicDir);
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 960, minHeight: 640,
    title: 'Connect Sphere', backgroundColor: '#211f1b', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  await win.loadURL('http://127.0.0.1:' + port + '/');
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

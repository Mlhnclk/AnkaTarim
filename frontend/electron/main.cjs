const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

app.setName('Anka Tarimsal Takip');

let backendProcess;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function loadOrCreateSecret(userDataPath) {
  const secretPath = path.join(userDataPath, 'django-secret.key');
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, 'utf8').trim();

  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(secretPath, secret, { flag: 'wx' });
  return secret;
}

function seedDatabase(userDataPath) {
  const databasePath = path.join(userDataPath, 'db.sqlite3');
  const seedPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'anka-seed.sqlite3')
    : path.resolve(__dirname, '../../backend/db.sqlite3');

  if (!fs.existsSync(databasePath) && fs.existsSync(seedPath)) {
    fs.copyFileSync(seedPath, databasePath);
  }
  return databasePath;
}

async function waitForBackend(port, child) {
  const healthUrl = `http://127.0.0.1:${port}/`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Local database service exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // The service may still be applying database migrations.
    }
    await wait(250);
  }
  throw new Error('The local database service did not start in time.');
}

async function startBackend() {
  const userDataPath = app.getPath('userData');
  fs.mkdirSync(userDataPath, { recursive: true });
  const databasePath = seedDatabase(userDataPath);
  const port = await findFreePort();
  const backendDirectory = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.resolve(__dirname, '../../backend');
  const executable = app.isPackaged
    ? path.join(backendDirectory, 'anka-backend.exe')
    : process.env.PYTHON || 'python';
  const args = app.isPackaged ? [] : [path.join(backendDirectory, 'desktop_server.py')];
  const child = spawn(executable, args, {
    cwd: backendDirectory,
    env: {
      ...process.env,
      ANKA_DESKTOP: 'true',
      ANKA_PORT: String(port),
      DJANGO_ALLOWED_HOSTS: '127.0.0.1,localhost',
      DJANGO_DEBUG: 'false',
      DJANGO_SECRET_KEY: loadOrCreateSecret(userDataPath),
      DJANGO_SETTINGS_MODULE: 'config.settings',
      DJANGO_SQLITE_PATH: databasePath,
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  backendProcess = child;

  const spawnError = new Promise((resolve, reject) => {
    child.once('error', reject);
  });
  await Promise.race([waitForBackend(port, child), spawnError]);
  return port;
}

ipcMain.handle('print-html', async (_event, html) => {
  if (!html || typeof html !== 'string') return false;

  let printWindow;
  try {
    printWindow = new BrowserWindow({
      show: false,
      fullscreen: false,
      skipTaskbar: true,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: false,
      },
    });

    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );

    const printers = await printWindow.webContents.getPrinters();
    if (!printers || printers.length === 0) {
      console.warn('Yazıcı bulunamadı. Varsayılan yazıcı kurulmalı.');
      return false;
    }

    const defaultPrinter = printers.find((printer) => printer.isDefault) || printers[0];

    return await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' },
          deviceName: defaultPrinter.name,
        },
        (success, failureReason) => {
          if (!success) {
            console.error('Fiş yazdırılamadı:', failureReason);
          }
          resolve(success);
        },
      );
    });
  } catch (error) {
    console.error('Printer output failed:', error);
    return false;
  } finally {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
});

async function createWindow() {
  const port = await startBackend();
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const apiBaseUrl = `http://127.0.0.1:${port}/api/`;

  if (app.isPackaged) {
    await window.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { apiBaseUrl },
    });
  } else {
    const devUrl = new URL('http://127.0.0.1:5173/');
    devUrl.searchParams.set('apiBaseUrl', apiBaseUrl);
    await window.loadURL(devUrl.toString());
  }
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    dialog.showErrorBox('Anka Tarimsal Takip could not start', error.message);
    app.quit();
  }
});

app.on('before-quit', () => {
  backendProcess?.kill();
});

app.on('window-all-closed', () => {
  app.quit();
});
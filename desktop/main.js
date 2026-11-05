const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'نبض — NABD',
    backgroundColor: '#08080b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // تحميل index.html من الملفات المحلية (offline)
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // قائمة مبسّطة
  const menu = Menu.buildFromTemplate([
    { label: 'نبض', submenu: [
      { label: 'الرئيسية', click: () => mainWindow.loadFile(path.join(__dirname, '..', 'index.html')) },
      { label: 'الألعاب', click: () => mainWindow.loadFile(path.join(__dirname, '..', 'games.html')) },
      { type: 'separator' },
      { label: 'خروج', role: 'quit' }
    ]},
    { label: 'عرض', submenu: [
      { label: 'ملء الشاشة', role: 'togglefullscreen' },
      { label: 'تكبير', role: 'zoomIn' },
      { label: 'تصغير', role: 'zoomOut' },
      { label: 'إعادة تعيين', role: 'resetZoom' }
    ]}
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

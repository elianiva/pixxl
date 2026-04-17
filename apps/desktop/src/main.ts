import { app, BrowserWindow, Menu, shell } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startBackendServer } from "../../backend/src/main";

let mainWindow: BrowserWindow | null = null;
let backend: Awaited<ReturnType<typeof startBackendServer>> | null = null;
let shuttingDown = false;

const appName = "Pixxl";

function getPreloadPath() {
  return join(fileURLToPath(new URL(".", import.meta.url)), "../preload/preload.mjs");
}

function getRendererIndexPath() {
  return join(process.resourcesPath, "renderer", "index.html");
}

function buildMenu() {
  const template = [
    {
      label: appName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [{ role: "close" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Project Home",
          click: async () => {
            await shell.openExternal("https://github.com/elianiva/pixxl");
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createMainWindow(backendPort: number) {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: appName,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: getPreloadPath(),
    },
  });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  if (app.isPackaged) {
    await win.loadFile(getRendererIndexPath(), {
      query: {
        backendPort: String(backendPort),
      },
    });
  } else {
    const rendererUrl = "http://localhost:5173";
    console.log(`[Desktop] renderer ready at ${rendererUrl}`);
    await win.loadURL(`${rendererUrl}?backendPort=${backendPort}`);
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.once("ready-to-show", () => win.show());

  return win;
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    await backend?.close();
  } finally {
    backend = null;
  }
}

async function bootstrap() {
  buildMenu();
  backend = await startBackendServer();
  console.log(`[Desktop] backend started on port ${backend.port}`);
  mainWindow = await createMainWindow(backend.port);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("second-instance", async () => {
  if (!mainWindow) {
    if (!backend) return;
    mainWindow = await createMainWindow(backend.port);
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(() => {
  void bootstrap().catch((error) => {
    console.error("[Desktop] bootstrap failed:", error);
  });
});

app.on("activate", async () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  if (backend) {
    mainWindow = await createMainWindow(backend.port);
    return;
  }

  await bootstrap();
});

app.on("before-quit", () => shutdown());

app.on("window-all-closed", () => {
  // macOS keeps the app alive; single window only.
});

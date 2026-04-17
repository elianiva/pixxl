import { app, BrowserWindow, Menu, shell } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startBackendServer } from "../../backend/src/main";

let mainWindow: BrowserWindow | null = null;
let backend: Awaited<ReturnType<typeof startBackendServer>> | null = null;
let shuttingDown = false;

const appName = "Pixxl";
const devRendererUrls = [
  process.env.PIXXL_RENDERER_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter((url): url is string => Boolean(url));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDevRendererUrl() {
  for (;;) {
    for (const url of devRendererUrls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) {
          await response.body?.cancel();
          return url;
        }
      } catch {}
    }
    await sleep(200);
  }
}

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
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
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
  const window = new BrowserWindow({
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

  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  if (app.isPackaged) {
    await window.loadFile(getRendererIndexPath(), {
      query: {
        backendPort: String(backendPort),
      },
    });
  } else {
    const rendererUrl = await waitForDevRendererUrl();
    console.log(`[Desktop] renderer ready at ${rendererUrl}`);
    await window.loadURL(`${rendererUrl}?backendPort=${backendPort}`);
    window.webContents.openDevTools({ mode: "detach" });
  }

  window.once("ready-to-show", () => {
    window.show();
  });

  return window;
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

app.on("before-quit", () => {
  void shutdown();
});

app.on("window-all-closed", () => {
  // macOS keeps the app alive; single window only.
});

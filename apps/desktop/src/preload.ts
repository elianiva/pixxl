import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("pixxl", {
  platform: process.platform,
});

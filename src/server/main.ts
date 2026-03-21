import { Hono } from "hono";
import { serve } from "@hono/node-server";

const PORT = Number.parseInt(process.env.HONO_PORT || "3000", 10);

const app = new Hono();

app.get("/", (c) => c.text("Hello from hono"));

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`🚀 Server started at http://localhost:${info.port}`);
  },
);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});

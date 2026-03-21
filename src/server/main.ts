import { Hono } from "hono";

const PORT = Number.parseInt(process.env.HONO_PORT || "3000", 10);

const app = new Hono();

app.get("/", (c) => c.text("Hello from hono"));

export default {
  port: PORT,
  fetch: app.fetch,
};

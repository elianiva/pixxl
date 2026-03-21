import { Hono } from "hono";

const app = new Hono();

app.get("/api/", (c) => c.text("Hello from hono"));

export default app;

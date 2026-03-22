import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$projectId/")({
  component: App,
});

function App() {
  return (
    <main>
      <h1>hello world</h1>
    </main>
  );
}

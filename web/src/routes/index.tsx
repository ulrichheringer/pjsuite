import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <main style={{ padding: 40 }}>
      <img src="/brand/wordmark-light.svg" alt="PJ Suite" height={32} />
    </main>
  ),
});

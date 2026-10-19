import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const delivery = (kind: "adjust" | "approve" | null) => ({
  number: 2,
  title: "Ajustes finais",
  message: "",
  publishedAt: "2026-10-18T10:00:00Z",
  response: kind && { kind, message: "", createdAt: "2026-10-19T10:00:00Z" },
  files: [],
});

const conclusionRoutes = (
  served: () => unknown,
  extra?: (path: string, init?: RequestInit) => Response | undefined,
) =>
  mockFetch(
    (path, init) =>
      extra?.(path, init) ??
      (path === "/api/projects/5/deliveries" && !init?.method
        ? jsonResponse(200, served())
        : jsonResponse(500)),
  );

const listing = (
  phase: string,
  kind: "adjust" | "approve" | null,
  completedAt: string | null = null,
) => ({
  phase,
  completedAt,
  draft: null,
  published: [delivery(kind)],
});

test("an approved delivery can be concluded and the project is frozen", async () => {
  let done = false;
  const spy = conclusionRoutes(
    () =>
      done
        ? listing("completed", "approve", "2026-10-20T10:00:00Z")
        : listing("executing", "approve"),
    (path, init) => {
      if (path === "/api/projects/5/complete" && init?.method === "POST") {
        done = true;
        return jsonResponse(204);
      }
    },
  );
  renderAt("/projetos/5/conclusao");

  expect(await screen.findByText("Entrega 2 · Ajustes finais")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Concluir projeto" }));

  expect(await screen.findByText("Projeto concluído.")).toBeVisible();
  expect(screen.getByText("Concluído")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Concluir projeto" })).toBeNull();
  expect(spy.mock.calls.some(([path]) => path === "/api/projects/5/complete")).toBe(true);
});

test("without an approved latest delivery the project cannot be concluded", async () => {
  conclusionRoutes(() => listing("awaiting_adjustment", "adjust"));
  renderAt("/projetos/5/conclusao");

  expect(await screen.findByText("Aguardando a aprovação do cliente.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Concluir projeto" })).toBeNull();
});

test("a completed project shows the success banner and the summary", async () => {
  conclusionRoutes(() => listing("completed", "approve", "2026-10-20T10:00:00Z"));
  renderAt("/projetos/5/conclusao");

  expect(await screen.findByText("Projeto concluído.")).toBeVisible();
  expect(screen.getByText("Entrega 2 · Ajustes finais")).toBeVisible();
});

test("a failed conclusion shows an error and keeps the action", async () => {
  conclusionRoutes(
    () => listing("executing", "approve"),
    (path, init) =>
      path === "/api/projects/5/complete" && init?.method === "POST"
        ? jsonResponse(409, { errors: { delivery: "Aprove a última entrega antes de concluir." } })
        : undefined,
  );
  renderAt("/projetos/5/conclusao");

  await userEvent.click(await screen.findByRole("button", { name: "Concluir projeto" }));

  expect(await screen.findByText("Não foi possível concluir o projeto.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Concluir projeto" })).toBeEnabled();
});

test("the conclusion screen shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/projetos/5/conclusao");

  expect(await screen.findByText("Não foi possível carregar a conclusão.")).toBeVisible();
});

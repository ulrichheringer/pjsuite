import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const portal = {
  version: 1,
  status: "signed",
  completedAt: null,
  signature: null,
  content: {
    project: "Ensaio de marca",
    professional: { name: "Helena Duarte" },
    client: { name: "Ana Lima" },
  },
};

const event = (kind: string, actor: "pro" | "client", actorName: string, extra = {}) => ({
  kind,
  actor,
  actorName,
  number: 1,
  message: "",
  createdAt: "2026-10-19T14:32:00Z",
  ...extra,
});

const historyRoutes = (served: () => Response) =>
  mockFetch((path) => {
    if (path === "/api/portal/TOK") return jsonResponse(200, portal);
    if (path === "/api/portal/TOK/events") return served();
    return jsonResponse(500);
  });

test("the progress screen links to the history", async () => {
  historyRoutes(() => jsonResponse(200, []));
  renderAt("/p/TOK/acompanhar");

  expect(await screen.findByRole("link", { name: "Ver histórico" })).toHaveAttribute(
    "href",
    "/p/TOK/historico",
  );
});

test("client history lists the shared events with author and date", async () => {
  historyRoutes(() =>
    jsonResponse(200, [
      event("signed", "client", "Ana Lima"),
      event("version_shared", "pro", "Helena Duarte"),
    ]),
  );
  renderAt("/p/TOK/historico");

  const items = await screen.findAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("Contrato v1 assinado");
  expect(items[0]).toHaveTextContent("Ana Lima");
  expect(items[0]).toHaveTextContent("2026");
  expect(items[1]).toHaveTextContent("Versão 1 compartilhada");
  expect(items[1]).toHaveTextContent("Helena Duarte");
});

test("client history shows the empty state without shared events", async () => {
  historyRoutes(() => jsonResponse(200, []));
  renderAt("/p/TOK/historico");

  expect(await screen.findByText("Nenhum evento compartilhado ainda.")).toBeVisible();
  expect(screen.queryByRole("listitem")).toBeNull();
});

test("client history shows an error banner when loading fails", async () => {
  historyRoutes(() => jsonResponse(500));
  renderAt("/p/TOK/historico");

  expect(await screen.findByText("Não foi possível carregar o histórico.")).toBeVisible();
});

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const event = (
  id: number,
  kind: string,
  actor: "pro" | "client",
  actorName: string,
  extra = {},
) => ({
  id,
  kind,
  actor,
  actorName,
  number: 0,
  message: "",
  shared: true,
  createdAt: "2026-10-19T14:32:00Z",
  ...extra,
});

const events = [
  event(3, "change_requested", "client", "Ana Lima", { number: 1, message: "Trocar prazo" }),
  event(2, "version_shared", "pro", "Helena Duarte", { number: 1 }),
  event(1, "project_created", "pro", "Helena Duarte", { shared: false }),
];

const historyRoutes = (served: () => Response) =>
  mockFetch((path) => (path === "/api/projects/5/events" ? served() : jsonResponse(500)));

test("history lists events newest first with author and date", async () => {
  historyRoutes(() => jsonResponse(200, events));
  renderAt("/projetos/5/historico");

  const items = await screen.findAllByRole("listitem");
  expect(items).toHaveLength(3);
  expect(items[0]).toHaveTextContent("Alteração solicitada: Trocar prazo");
  expect(items[0]).toHaveTextContent("Ana Lima");
  expect(items[0]).toHaveTextContent("2026");
  expect(items[1]).toHaveTextContent("Versão 1 compartilhada");
  expect(items[2]).toHaveTextContent("Projeto criado");
  expect(items[2]).toHaveTextContent("Helena Duarte");
});

test("the client actions filter hides professional events", async () => {
  historyRoutes(() => jsonResponse(200, events));
  renderAt("/projetos/5/historico");

  await screen.findAllByRole("listitem");
  await userEvent.click(screen.getByRole("tab", { name: "Ações do cliente" }));

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(1);
  expect(within(items[0]).getByText("Alteração solicitada: Trocar prazo")).toBeVisible();

  await userEvent.click(screen.getByRole("tab", { name: "Tudo" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
});

test("the client actions filter without client events shows an empty state", async () => {
  historyRoutes(() => jsonResponse(200, events.slice(1)));
  renderAt("/projetos/5/historico");

  await screen.findAllByRole("listitem");
  await userEvent.click(screen.getByRole("tab", { name: "Ações do cliente" }));

  expect(await screen.findByText("Nenhuma ação do cliente ainda.")).toBeVisible();
  expect(screen.queryByRole("listitem")).toBeNull();
});

test("the history nav shows the unread count", async () => {
  mockFetch((path) =>
    path === "/api/notifications"
      ? jsonResponse(200, { unread: 4, items: [] })
      : path === "/api/projects/5/events"
        ? jsonResponse(200, events)
        : jsonResponse(500),
  );
  renderAt("/projetos/5/historico");

  expect(await screen.findByRole("link", { name: /Avisos/ })).toHaveTextContent("4");
});

test("a project without events shows the empty state", async () => {
  historyRoutes(() => jsonResponse(200, []));
  renderAt("/projetos/5/historico");

  expect(await screen.findByText("Nenhum evento registrado ainda.")).toBeVisible();
  expect(screen.queryByRole("listitem")).toBeNull();
});

test("history shows an error banner when loading fails", async () => {
  historyRoutes(() => jsonResponse(500));
  renderAt("/projetos/5/historico");

  expect(await screen.findByText("Não foi possível carregar o histórico.")).toBeVisible();
});

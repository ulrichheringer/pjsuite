import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";
import type { EventKind, Notifications } from "@/api";

afterEach(() => vi.unstubAllGlobals());

const notification = (id: number, kind: EventKind, extra = {}) => ({
  id,
  projectId: 5,
  projectName: "Ensaio de marca",
  kind,
  actorName: "Ana Lima",
  number: 1,
  message: "",
  createdAt: "2026-10-19T14:32:00Z",
  read: false,
  ...extra,
});

const unreadOf = (items: { read: boolean }[]) => items.filter((n) => !n.read).length;

function noticeRoutes(items: Notifications["items"]) {
  return mockFetch((path, init) => {
    if (path === "/api/notifications" && !init?.method)
      return jsonResponse(200, { unread: unreadOf(items), items });
    const one = /^\/api\/notifications\/(\d+)\/read$/.exec(path);
    if (one && init?.method === "POST") {
      const found = items.find((n) => n.id === Number(one[1]));
      if (found) found.read = true;
      return jsonResponse(204);
    }
    if (path === "/api/notifications/read-all" && init?.method === "POST") {
      items.forEach((n) => (n.read = true));
      return jsonResponse(204);
    }
    return jsonResponse(500);
  });
}

const twoNotices = () => [
  notification(2, "change_requested", { message: "Trocar prazo" }),
  notification(1, "client_viewed"),
];

test("notices list client actions with project, author and the unread badge", async () => {
  noticeRoutes(twoNotices());
  renderAt("/avisos");

  const items = await screen.findAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("Alteração solicitada: Trocar prazo");
  expect(items[0]).toHaveTextContent("Ensaio de marca");
  expect(items[0]).toHaveTextContent("Ana Lima");
  expect(within(items[0]).getByRole("link", { name: "Abrir projeto" })).toHaveAttribute(
    "href",
    "/projetos/5",
  );
  expect(screen.getByRole("link", { name: /Avisos/ })).toHaveTextContent("2");
});

test("marking one notice as read updates the badge", async () => {
  const spy = noticeRoutes(twoNotices());
  renderAt("/avisos");

  const first = (await screen.findAllByRole("listitem"))[0];
  await userEvent.click(within(first).getByRole("button", { name: "Marcar como lida" }));

  expect(await screen.findByRole("link", { name: /Avisos/ })).toHaveTextContent("1");
  expect(within(first).queryByRole("button", { name: "Marcar como lida" })).toBeNull();
  expect(
    spy.mock.calls.some(
      ([path, init]) => path === "/api/notifications/2/read" && init?.method === "POST",
    ),
  ).toBe(true);
});

test("marking all as read clears the badge", async () => {
  const spy = noticeRoutes(twoNotices());
  renderAt("/avisos");

  await userEvent.click(await screen.findByRole("button", { name: "Marcar todas como lidas" }));

  expect(await screen.findByRole("link", { name: "Avisos" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Marcar como lida" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Marcar todas como lidas" })).toBeNull();
  expect(spy.mock.calls.some(([path]) => path === "/api/notifications/read-all")).toBe(true);
});

test("without notices the empty state shows", async () => {
  noticeRoutes([]);
  renderAt("/avisos");

  expect(await screen.findByText("Nenhum aviso por enquanto.")).toBeVisible();
});

test("notices show an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/avisos");

  expect(await screen.findByText("Não foi possível carregar os avisos.")).toBeVisible();
});
test("notices redirect to /entrar when the session expired", async () => {
  mockFetch(() => jsonResponse(401));
  const router = renderAt("/avisos");

  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
});

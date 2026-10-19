import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const project = {
  id: 5,
  clientId: 1,
  clientName: "Ana Lima",
  name: "Ensaio de marca",
  area: "Design",
  reference: "",
  goal: "",
  structure: "essential",
  status: "changes_requested",
  archived: false,
  scope: "",
  outcome: "",
  notes: "",
};

const share = {
  token: "TOK",
  url: "/p/TOK",
  viewedAt: null,
  request: {
    kind: "change",
    message: "Começar às 14h",
    version: 1,
    createdAt: "2026-09-20T14:32:00Z",
  },
};

const versions = {
  versions: [{ number: 1, hash: "h", note: "", createdAt: "2026-09-19T10:00:00Z" }],
  signature: null,
};

const revisionRoutes = (extra?: (path: string, init?: RequestInit) => Response | undefined) =>
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/share" && !init?.method) return jsonResponse(200, share);
    if (path === "/api/projects/5/contract" && !init?.method) return jsonResponse(200, versions);
    return extra?.(path, init) ?? jsonResponse(500);
  });

test("revision screen shows the request, the next version and the builder link", async () => {
  revisionRoutes();
  renderAt("/projetos/5/revisao");

  expect(await screen.findByText("Começar às 14h")).toBeVisible();
  expect(screen.getByText("A próxima publicação será a versão 2.")).toBeVisible();
  expect(screen.getByRole("link", { name: /Editar projeto/ })).toHaveAttribute(
    "href",
    "/projetos/5/montagem",
  );
});

test("publishing posts the note and returns to the share screen", async () => {
  const spy = revisionRoutes((path, init) => {
    if (path === "/api/projects/5/contract/revision" && init?.method === "POST")
      return jsonResponse(201, { number: 2, hash: "h2", note: "Prazo", createdAt: "x" });
  });
  const router = renderAt("/projetos/5/revisao");

  await userEvent.type(await screen.findByLabelText(/O que mudou/), "Prazo ajustado");
  await userEvent.click(screen.getByRole("button", { name: /Finalizar e reenviar/ }));

  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/projetos/5/compartilhar"));
  const call = spy.mock.calls.find(([path]) => path === "/api/projects/5/contract/revision")!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ note: "Prazo ajustado" });
});

test("publishing shows the server field error", async () => {
  revisionRoutes((path, init) => {
    if (path === "/api/projects/5/contract/revision" && init?.method === "POST")
      return jsonResponse(400, { errors: { note: "Descreva o que mudou (até 4000 caracteres)." } });
  });
  renderAt("/projetos/5/revisao");

  await userEvent.type(await screen.findByLabelText(/O que mudou/), "x");
  await userEvent.click(screen.getByRole("button", { name: /Finalizar e reenviar/ }));
  expect(await screen.findByText("Descreva o que mudou (até 4000 caracteres).")).toBeVisible();
});

test("publishing shows a banner when the server fails", async () => {
  revisionRoutes();
  renderAt("/projetos/5/revisao");

  await userEvent.type(await screen.findByLabelText(/O que mudou/), "x");
  await userEvent.click(screen.getByRole("button", { name: /Finalizar e reenviar/ }));
  expect(await screen.findByText("Não foi possível publicar a nova versão.")).toBeVisible();
});

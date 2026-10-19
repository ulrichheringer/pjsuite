import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const content = {
  project: "Ensaio de marca",
  professional: { name: "Helena Duarte", company: "Helena Foto", email: "helena@example.com" },
  client: { name: "Ana Lima", email: "ana@example.com" },
  scope: { scope: "Retratos em estúdio", outcome: "Galeria publicada" },
  stages: [{ name: "Descoberta", timingKind: "deadline", timing: "Até 05 out" }],
  price: {
    priceCents: 150000,
    payments: [{ kind: "unico", percent: 100, trigger: "assinatura", due: "Na assinatura" }],
  },
};

const portal = (status = "viewed") => ({ version: 1, status, content });

const portalRoutes = (
  status: string,
  extra?: (path: string, init?: RequestInit) => Response | undefined,
) =>
  mockFetch((path, init) => {
    if (path === "/api/portal/TOK" && !init?.method) return jsonResponse(200, portal(status));
    return extra?.(path, init) ?? jsonResponse(500);
  });

test("review screen renders the visible blocks and the decision actions", async () => {
  portalRoutes("viewed");
  renderAt("/p/TOK");

  expect(await screen.findByRole("heading", { name: "Ensaio de marca" })).toBeVisible();
  expect(screen.getByText("Retratos em estúdio")).toBeVisible();
  expect(screen.getByText("Descoberta")).toBeVisible();
  expect(screen.getByText(/R\$\s*1\.500,00/)).toBeVisible();
  expect(screen.queryByText("Arquivos do projeto")).toBeNull();
  expect(screen.getByRole("link", { name: /Solicitar alteração/ })).toHaveAttribute(
    "href",
    "/p/TOK/alteracao",
  );
  expect(screen.getByRole("link", { name: /Recusar/ })).toHaveAttribute("href", "/p/TOK/recusar");
});

test("a refused project shows no decision actions", async () => {
  portalRoutes("refused");
  renderAt("/p/TOK");

  expect(await screen.findByText("Você recusou este projeto.")).toBeVisible();
  expect(screen.queryByRole("link", { name: /Solicitar alteração/ })).toBeNull();
  expect(screen.queryByRole("link", { name: /Recusar/ })).toBeNull();
});

test("the review shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/p/TOK");

  expect(await screen.findByText("Não foi possível abrir o projeto.")).toBeVisible();
});

test("the change request form posts the message and confirms", async () => {
  const spy = portalRoutes("viewed", (path, init) => {
    if (path === "/api/portal/TOK/change" && init?.method === "POST") return jsonResponse(204);
  });
  renderAt("/p/TOK/alteracao");

  await userEvent.type(await screen.findByLabelText(/O que deve mudar/), "Trocar prazo");
  await userEvent.click(screen.getByRole("button", { name: /Enviar solicitação/ }));

  expect(await screen.findByText("Solicitação enviada.")).toBeVisible();
  const call = spy.mock.calls.find(([path]) => path === "/api/portal/TOK/change")!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ message: "Trocar prazo" });
});

test("the change request form shows the server error", async () => {
  portalRoutes("viewed", (path, init) => {
    if (path === "/api/portal/TOK/change" && init?.method === "POST")
      return jsonResponse(400, {
        errors: { message: "Descreva a alteração (até 4000 caracteres)." },
      });
  });
  renderAt("/p/TOK/alteracao");

  await userEvent.type(await screen.findByLabelText(/O que deve mudar/), "x");
  await userEvent.click(screen.getByRole("button", { name: /Enviar solicitação/ }));

  expect(await screen.findByText("Descreva a alteração (até 4000 caracteres).")).toBeVisible();
});

test("the refuse form confirms with an optional reason", async () => {
  const spy = portalRoutes("viewed", (path, init) => {
    if (path === "/api/portal/TOK/refuse" && init?.method === "POST") return jsonResponse(204);
  });
  renderAt("/p/TOK/recusar");

  await userEvent.type(await screen.findByLabelText(/Motivo/), "Fora do orçamento");
  await userEvent.click(screen.getByRole("button", { name: /Confirmar recusa/ }));

  expect(await screen.findByText("Recusa registrada.")).toBeVisible();
  const call = spy.mock.calls.find(([path]) => path === "/api/portal/TOK/refuse")!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ reason: "Fora do orçamento" });
});

test("a failed refuse shows an error and keeps the form", async () => {
  portalRoutes("viewed");
  renderAt("/p/TOK/recusar");

  await userEvent.click(await screen.findByRole("button", { name: /Confirmar recusa/ }));

  expect(await screen.findByText("Não foi possível registrar a recusa.")).toBeVisible();
  expect(screen.getByRole("button", { name: /Confirmar recusa/ })).toBeEnabled();
});

test.each(["/p/NOPE", "/p/NOPE/alteracao", "/p/NOPE/recusar"])(
  "%s shows the invalid link page without project data",
  async (path) => {
    mockFetch(() => jsonResponse(404, { error: "link_invalid" }));
    renderAt(path);

    expect(await screen.findByText("Link inválido")).toBeVisible();
    expect(screen.queryByText("Ensaio de marca")).toBeNull();
  },
);

test.each([
  ["/p/TOK/alteracao", "/api/portal/TOK/change", /Enviar solicitação/, /O que deve mudar/],
  ["/p/TOK/recusar", "/api/portal/TOK/refuse", /Confirmar recusa/, null],
])("%s shows the refused message on 409", async (route, endpoint, button, label) => {
  portalRoutes("viewed", (path, init) => {
    if (path === endpoint && init?.method === "POST")
      return jsonResponse(409, { errors: { status: "O contrato já foi recusado." } });
  });
  renderAt(route);

  if (label) await userEvent.type(await screen.findByLabelText(label), "x");
  await userEvent.click(await screen.findByRole("button", { name: button }));

  expect(await screen.findByText("Este projeto já foi recusado.")).toBeVisible();
});

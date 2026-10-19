import { screen, waitFor, within } from "@testing-library/react";
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
  status: "draft",
  archived: false,
  scope: "Retratos em estúdio",
  outcome: "Galeria publicada",
  notes: "Conferir bateria",
};

const view = {
  project: "Ensaio de marca",
  professional: { name: "Helena Duarte", company: "Helena Foto", email: "helena@example.com" },
  client: { name: "Ana Lima", email: "ana@example.com" },
  scope: { scope: "Retratos em estúdio", outcome: "Galeria publicada" },
  stages: [{ name: "Descoberta", timingKind: "deadline", timing: "Até 05 out" }],
  deliverables: [{ stage: "Descoberta", text: "Briefing aprovado" }],
  price: {
    priceCents: 150000,
    payments: [{ kind: "unico", percent: 100, trigger: "assinatura", due: "Na assinatura" }],
  },
};

const contractRoutes = (extra?: (path: string, init?: RequestInit) => Response | undefined) =>
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/client-view") return jsonResponse(200, view);
    return extra?.(path, init) ?? jsonResponse(500);
  });

test("contract screen shows the checklist and the contract sheet built from the client view", async () => {
  contractRoutes();
  renderAt("/projetos/5/contrato");

  const sheet = (await screen.findByText("CONTRATO / V1")).closest(".contract-paper")!;
  const paper = within(sheet as HTMLElement);
  expect(paper.getByRole("heading", { name: "Ensaio de marca" })).toBeVisible();
  expect(paper.getByText("Helena Foto")).toBeVisible();
  expect(paper.getAllByText("Ana Lima")).not.toHaveLength(0);
  expect(paper.getByText("Retratos em estúdio")).toBeVisible();
  expect(paper.getByText("Descoberta · Data limite: Até 05 out")).toBeVisible();
  expect(paper.getByText(/Valor total: R\$\s*1\.500,00/)).toBeVisible();
  expect(paper.queryByText("Conferir bateria")).toBeNull();

  const aside = screen.getByText("Conferência final").closest("aside")!;
  for (const line of [
    "Cliente identificado",
    "Escopo preenchido",
    "Prazos definidos",
    "Preço e condições",
  ]) {
    expect(within(aside).getByText(line)).toBeVisible();
  }
});

test("Finalizar projeto posts the contract and opens the PDF view", async () => {
  const spy = contractRoutes((path, init) => {
    if (path === "/api/projects/5/contract" && init?.method === "POST")
      return jsonResponse(201, {
        number: 1,
        hash: "h",
        createdAt: "2026-10-18T00:00:00Z",
        content: view,
      });
    if (path === "/api/projects/5/contract/1")
      return jsonResponse(200, {
        number: 1,
        hash: "h",
        createdAt: "2026-10-18T00:00:00Z",
        content: view,
      });
  });
  const router = renderAt("/projetos/5/contrato");
  await userEvent.click(await screen.findByRole("button", { name: /Finalizar projeto/ }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/projetos/5/contrato/1"));
  expect(
    spy.mock.calls.some(
      ([path, init]) => path === "/api/projects/5/contract" && init?.method === "POST",
    ),
  ).toBe(true);
});

test("a failed finalize shows an error banner and stays on the screen", async () => {
  contractRoutes();
  const router = renderAt("/projetos/5/contrato");
  await userEvent.click(await screen.findByRole("button", { name: /Finalizar projeto/ }));

  expect(await screen.findByText("Não foi possível finalizar o projeto.")).toBeVisible();
  expect(router.state.location.pathname).toBe("/projetos/5/contrato");
  expect(screen.getByRole("button", { name: /Finalizar projeto/ })).toBeEnabled();
});

test("an already finalized project opens its stored contract", async () => {
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method)
      return jsonResponse(200, { ...project, status: "final" });
    if (path === "/api/projects/5/client-view") return jsonResponse(200, view);
    if (path === "/api/projects/5/contract/1")
      return jsonResponse(200, {
        number: 1,
        hash: "h",
        createdAt: "2026-10-18T00:00:00Z",
        content: view,
      });
    return jsonResponse(500);
  });
  const router = renderAt("/projetos/5/contrato");
  await waitFor(() => expect(router.state.location.pathname).toBe("/projetos/5/contrato/1"));
});

test("visibility screen links to the contract", async () => {
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/visibility") return jsonResponse(200, {});
    if (path === "/api/projects/5/client-view") return jsonResponse(200, view);
    if (path === "/api/projects/5/contract/1") return jsonResponse(404);
    return jsonResponse(500);
  });
  const router = renderAt("/projetos/5/visibilidade");
  await userEvent.click(await screen.findByRole("link", { name: /Conferir contrato/ }));
  await waitFor(() => expect(router.state.location.pathname).toBe("/projetos/5/contrato"));
});

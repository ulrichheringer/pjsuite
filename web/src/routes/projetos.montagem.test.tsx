import { screen, within } from "@testing-library/react";
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

const stage = (id: number, name: string, extra = {}) => ({
  id,
  name,
  timingKind: "deadline",
  timing: "Até 05 out",
  deliverable: "Briefing aprovado",
  visible: true,
  tasks: [
    { id: id * 10, title: "Kickoff" },
    { id: id * 10 + 1, title: "Objetivos" },
  ],
  ...extra,
});

const stages = [
  stage(1, "Descoberta"),
  stage(2, "Execução", {
    timingKind: "none",
    timing: "",
    deliverable: "",
    visible: false,
    tasks: [{ id: 30, title: "Gravar" }],
  }),
];

const builderRoutes = (extra?: (path: string, init?: RequestInit) => Response | undefined) =>
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/stages" && !init?.method) return jsonResponse(200, stages);
    return extra?.(path, init) ?? jsonResponse(500);
  });

test("builder lists stages with timing, task count, deliverable and internal label", async () => {
  builderRoutes();
  renderAt("/projetos/5/montagem");
  expect(await screen.findByRole("heading", { name: "Descoberta" })).toBeInTheDocument();

  const first = screen.getByRole("heading", { name: "Descoberta" }).closest(".phase-item")!;
  expect(first).toHaveTextContent("01");
  expect(first).toHaveTextContent("Data limite · Até 05 out");
  expect(first).toHaveTextContent("2 tarefas · Briefing aprovado");
  expect(first).not.toHaveTextContent("interno");

  const second = screen.getByRole("heading", { name: "Execução" }).closest(".phase-item")!;
  expect(second).toHaveTextContent("02");
  expect(second).toHaveTextContent("Sem prazo");
  expect(second).toHaveTextContent("1 tarefa · sem entregável");
  expect(second).toHaveTextContent("interno");

  const summary = screen.getByText("Estrutura do projeto").closest("section")!;
  expect(within(summary).getByText("etapas")).toHaveTextContent("2 etapas");
  expect(within(summary).getByText("tarefas")).toHaveTextContent("3 tarefas");
});

test("builder saves scope, outcome and internal notes", async () => {
  const fetchSpy = builderRoutes((path, init) =>
    path === "/api/projects/5/builder" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  const scope = await screen.findByLabelText(/O que será feito/);
  expect(scope).toHaveValue("Retratos em estúdio");
  expect(screen.getByLabelText("O que encerra o projeto?")).toHaveValue("Galeria publicada");
  expect(screen.getByLabelText("Só você vê")).toHaveValue("Conferir bateria");

  await user.clear(scope);
  await user.type(scope, "Escopo novo");
  await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));

  expect(await screen.findByText("Montagem salva.")).toBeInTheDocument();
  const put = fetchSpy.mock.calls.find(([, init]) => init?.method === "PUT")!;
  expect(JSON.parse(String(put[1]?.body))).toEqual({
    scope: "Escopo novo",
    outcome: "Galeria publicada",
    notes: "Conferir bateria",
  });
});

test("builder shows an error banner when saving fails and keeps the text", async () => {
  builderRoutes((path, init) =>
    path === "/api/projects/5/builder" && init?.method === "PUT"
      ? jsonResponse(400, { errors: { scope: "Use até 2000 caracteres." } })
      : undefined,
  );
  renderAt("/projetos/5/montagem");
  await userEvent.setup().click(await screen.findByRole("button", { name: "Salvar rascunho" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar a montagem.");
  expect(screen.getByText("Use até 2000 caracteres.")).toBeInTheDocument();
  expect(screen.getByLabelText(/O que será feito/)).toHaveValue("Retratos em estúdio");
});

test("builder shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/projetos/5/montagem");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar a montagem.",
  );
});

test("builder redirects to /entrar on 401", async () => {
  mockFetch(() => jsonResponse(401));
  const router = renderAt("/projetos/5/montagem");
  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
});

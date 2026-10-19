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

const builderRoutes = (
  extra?: (path: string, init?: RequestInit) => Response | undefined,
  served: () => unknown = () => stages,
) =>
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/stages" && !init?.method) return jsonResponse(200, served());
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

const stageBody = {
  name: "Revisão",
  timingKind: "period",
  timing: "12 out",
  deliverable: "Versão para revisão",
  visible: false,
  tasks: ["Revisar", "Entregar"],
};

const sentBodies = (
  calls: readonly (readonly [RequestInfo | URL, RequestInit?])[],
  method: string,
  path: string,
) =>
  calls
    .filter(([p, init]) => p === path && init?.method === method)
    .map(([, init]) => JSON.parse(String(init?.body ?? "null")));

test("adding a stage posts the dialog form and shows the refreshed list", async () => {
  let served = stages;
  const fetchSpy = builderRoutes(
    (path, init) => {
      if (path !== "/api/projects/5/stages" || init?.method !== "POST") return undefined;
      served = [...stages, stage(3, "Revisão", { ...stageBody, tasks: [] })];
      return jsonResponse(201, { id: 3 });
    },
    () => served,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Adicionar nova etapa/ }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Adicionar etapa", { selector: "h2" })).toBeInTheDocument();
  expect(within(dialog).getByRole("switch", { name: "Visível para o cliente" })).toBeChecked();
  await user.type(within(dialog).getByLabelText(/Nome da etapa/), "Revisão");
  await user.selectOptions(within(dialog).getByLabelText("Como o prazo funciona?"), "Período");
  await user.type(within(dialog).getByLabelText("Prazo ou referência"), "12 out");
  await user.type(
    within(dialog).getByLabelText("Tarefas — uma por linha"),
    "Revisar{Enter}Entregar",
  );
  await user.type(
    within(dialog).getByLabelText("Entregável ou critério de conclusão"),
    "Versão para revisão",
  );
  await user.click(within(dialog).getByRole("switch", { name: "Visível para o cliente" }));
  await user.click(within(dialog).getByRole("button", { name: "Adicionar etapa" }));

  expect(await screen.findByRole("heading", { name: "Revisão" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(sentBodies(fetchSpy.mock.calls, "POST", "/api/projects/5/stages")).toEqual([stageBody]);
  expect(screen.getByRole("heading", { name: "Revisão" }).closest(".phase-item")).toHaveTextContent(
    "interno",
  );
});

test("a rejected stage keeps the dialog open with the field error", async () => {
  builderRoutes((path, init) =>
    path === "/api/projects/5/stages" && init?.method === "POST"
      ? jsonResponse(400, { errors: { name: "Informe o nome da etapa (até 120 caracteres)." } })
      : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Adicionar nova etapa/ }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Adicionar etapa" }));

  expect(
    await within(dialog).findByText("Informe o nome da etapa (até 120 caracteres)."),
  ).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("editing a stage prefills the dialog and puts the changes", async () => {
  const fetchSpy = builderRoutes((path, init) =>
    path === "/api/projects/5/stages/1" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Editar Descoberta" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Configurar etapa", { selector: "h2" })).toBeInTheDocument();
  const name = within(dialog).getByLabelText(/Nome da etapa/);
  expect(name).toHaveValue("Descoberta");
  expect(within(dialog).getByLabelText("Como o prazo funciona?")).toHaveValue("deadline");
  expect(within(dialog).getByLabelText("Tarefas — uma por linha")).toHaveValue(
    "Kickoff\nObjetivos",
  );
  await user.clear(name);
  await user.type(name, "Descoberta 2");
  await user.click(within(dialog).getByRole("button", { name: "Salvar etapa" }));

  await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(sentBodies(fetchSpy.mock.calls, "PUT", "/api/projects/5/stages/1")).toEqual([
    {
      name: "Descoberta 2",
      timingKind: "deadline",
      timing: "Até 05 out",
      deliverable: "Briefing aprovado",
      visible: true,
      tasks: ["Kickoff", "Objetivos"],
    },
  ]);
});

test("Sem prazo disables the timing field and clears it", async () => {
  const fetchSpy = builderRoutes((path, init) =>
    path === "/api/projects/5/stages/1" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Editar Descoberta" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("Prazo ou referência")).toBeEnabled();
  await user.selectOptions(within(dialog).getByLabelText("Como o prazo funciona?"), "Sem prazo");
  expect(within(dialog).getByLabelText("Prazo ou referência")).toBeDisabled();
  await user.click(within(dialog).getByRole("button", { name: "Salvar etapa" }));

  await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(sentBodies(fetchSpy.mock.calls, "PUT", "/api/projects/5/stages/1")[0]).toMatchObject({
    timingKind: "none",
    timing: "",
  });
});

test("removing a stage deletes it and refreshes the list", async () => {
  let served = stages;
  const fetchSpy = builderRoutes(
    (path, init) => {
      if (path !== "/api/projects/5/stages/2" || init?.method !== "DELETE") return undefined;
      served = [stages[0]!];
      return jsonResponse(204);
    },
    () => served,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Editar Execução" }));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: /Remover etapa/ }),
  );

  await vi.waitFor(() =>
    expect(screen.queryByRole("heading", { name: "Execução" })).not.toBeInTheDocument(),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    fetchSpy.mock.calls.some(
      ([p, init]) => p === "/api/projects/5/stages/2" && init?.method === "DELETE",
    ),
  ).toBe(true);
  expect(screen.getByRole("heading", { name: "Descoberta" })).toBeInTheDocument();
});

test("up and down buttons reorder stages through the order endpoint", async () => {
  let served = stages;
  const fetchSpy = builderRoutes(
    (path, init) => {
      if (path !== "/api/projects/5/stages/order" || init?.method !== "PUT") return undefined;
      served = [stages[1]!, stages[0]!];
      return jsonResponse(204);
    },
    () => served,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  expect(await screen.findByRole("button", { name: "Mover Descoberta para cima" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Mover Execução para baixo" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Mover Descoberta para baixo" }));

  await vi.waitFor(() => {
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Execução", "Descoberta"]);
  });
  expect(sentBodies(fetchSpy.mock.calls, "PUT", "/api/projects/5/stages/order")).toEqual([
    { ids: [2, 1] },
  ]);
});

test("a failed reorder shows an error banner", async () => {
  builderRoutes();
  renderAt("/projetos/5/montagem");
  await userEvent
    .setup()
    .click(await screen.findByRole("button", { name: "Mover Descoberta para baixo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível reordenar as etapas.",
  );
});

test("an archived project cannot change its stages", async () => {
  mockFetch((path) =>
    path === "/api/projects/5/stages"
      ? jsonResponse(200, stages)
      : jsonResponse(200, { ...project, archived: true }),
  );
  renderAt("/projetos/5/montagem");
  await screen.findByRole("heading", { name: "Descoberta" });
  expect(screen.queryByRole("button", { name: /Adicionar nova etapa/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Editar Descoberta" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Mover/ })).not.toBeInTheDocument();
});

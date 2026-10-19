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

const plan = {
  priceCents: 150000,
  payments: [
    { kind: "entrada", percent: 30, trigger: "assinatura", due: "Na assinatura do contrato" },
    { kind: "saldo", percent: 50, trigger: "antes_entrega", due: "" },
  ],
};

const builderRoutes = (
  extra?: (path: string, init?: RequestInit) => Response | undefined,
  served: () => unknown = () => stages,
) =>
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/stages" && !init?.method) return jsonResponse(200, served());
    if (path === "/api/projects/5/payments" && !init?.method) return jsonResponse(200, plan);
    return (
      extra?.(path, init) ??
      (path === "/api/projects/5/attachments" && !init?.method
        ? jsonResponse(200, [])
        : jsonResponse(500))
    );
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

test("payment plan shows the total, computed values and the distributed balance", async () => {
  builderRoutes();
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  const cards = await screen.findAllByRole("article");
  expect(cards).toHaveLength(2);
  expect(screen.getByLabelText("Valor total do projeto (R$)")).toHaveValue("1500");
  expect(cards[0]!.textContent).toMatch(/R\$\s450,00/);
  expect(cards[1]!.textContent).toMatch(/R\$\s750,00/);
  expect(screen.getByText("80% distribuído")).toBeInTheDocument();
  expect(screen.getByText("Faltam 20% para fechar o valor")).toBeInTheDocument();

  const slider = within(cards[0]!).getByRole("slider");
  slider.focus();
  await user.keyboard("{ArrowRight}");
  expect(cards[0]).toHaveTextContent("35%");
  expect(cards[0]!.textContent).toMatch(/R\$\s525,00/);
  expect(screen.getByText("85% distribuído")).toBeInTheDocument();

  await user.clear(screen.getByLabelText("Valor total do projeto (R$)"));
  await user.type(screen.getByLabelText("Valor total do projeto (R$)"), "2000");
  expect(cards[0]!.textContent).toMatch(/R\$\s700,00/);

  await user.click(screen.getByRole("button", { name: "Adicionar pagamento" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
  await user.click(screen.getByRole("button", { name: "Remover Parcela intermediária" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("a preset replaces the plan and Salvar puts it", async () => {
  const fetchSpy = builderRoutes((path, init) =>
    path === "/api/projects/5/payments" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "3 parcelas" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
  expect(screen.getByText("100% distribuído")).toBeInTheDocument();
  expect(screen.getByText("Plano fechado")).toBeInTheDocument();
  expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);

  await user.click(screen.getByRole("button", { name: "Salvar plano" }));
  expect(await screen.findByText("Plano de pagamento salvo.")).toBeInTheDocument();
  const [body] = sentBodies(fetchSpy.mock.calls, "PUT", "/api/projects/5/payments");
  expect(body.priceCents).toBe(150000);
  expect(body.payments.map((p: { kind: string; percent: number }) => [p.kind, p.percent])).toEqual([
    ["entrada", 35],
    ["parcela", 35],
    ["saldo", 30],
  ]);

  await user.click(screen.getByRole("button", { name: "À vista" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "30% + saldo" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByText("100% distribuído")).toBeInTheDocument();
});

test("rejected payment plan shows the server errors and keeps the edits", async () => {
  builderRoutes((path, init) =>
    path === "/api/projects/5/payments" && init?.method === "PUT"
      ? jsonResponse(400, {
          errors: {
            priceCents: "Informe um valor entre R$ 0 e R$ 10.000.000.",
            payments: "A soma dos percentuais passa de 100%.",
          },
        })
      : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Salvar plano" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível salvar o plano de pagamento.",
  );
  expect(screen.getByText("A soma dos percentuais passa de 100%.")).toBeInTheDocument();
  expect(screen.getByText("Informe um valor entre R$ 0 e R$ 10.000.000.")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("payment plan reports the excess when over 100%", async () => {
  builderRoutes();
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "3 parcelas" }));
  within(screen.getAllByRole("article")[0]!).getByRole("slider").focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("105% distribuído")).toBeInTheDocument();
  expect(screen.getByText("5% acima do valor")).toBeInTheDocument();
  expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
});

test("editing rows clears the saved banner and any row can be removed", async () => {
  builderRoutes((path, init) =>
    path === "/api/projects/5/payments" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "À vista" }));
  await user.click(screen.getByRole("button", { name: "Salvar plano" }));
  expect(await screen.findByText("Plano de pagamento salvo.")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Adicionar pagamento" }));
  expect(screen.queryByText("Plano de pagamento salvo.")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Salvar plano" }));
  expect(await screen.findByText("Plano de pagamento salvo.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remover Pagamento único" }));
  expect(screen.queryByText("Plano de pagamento salvo.")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remover Parcela intermediária" }));
  expect(screen.queryAllByRole("article")).toHaveLength(0);
});

test("Adicionar pagamento is disabled at 12 rows", async () => {
  builderRoutes();
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await screen.findAllByRole("article");
  const add = screen.getByRole("button", { name: "Adicionar pagamento" });
  for (let i = 0; i < 10; i++) await user.click(add);
  expect(screen.getAllByRole("article")).toHaveLength(12);
  expect(add).toBeDisabled();
});

test("a malformed total blocks saving with a field error", async () => {
  const fetchSpy = builderRoutes((path, init) =>
    path === "/api/projects/5/payments" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  const price = await screen.findByLabelText("Valor total do projeto (R$)");
  await user.clear(price);
  await user.type(price, "1,2,3");
  await user.click(screen.getByRole("button", { name: "Salvar plano" }));
  expect(await screen.findByText("Informe um valor válido.")).toBeInTheDocument();
  expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
});

type StoredAttachment = {
  id: number;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
};

const stored = (id: number, name: string, contentType: string, size: number): StoredAttachment => ({
  id,
  name,
  contentType,
  size,
  createdAt: "2026-10-18T10:00:00Z",
});

function attachmentRoutes(list: StoredAttachment[], archived = false) {
  return mockFetch((path, init) => {
    if (path === "/api/projects/5") return jsonResponse(200, { ...project, archived });
    if (path === "/api/projects/5/stages") return jsonResponse(200, stages);
    if (path === "/api/projects/5/payments") return jsonResponse(200, plan);
    if (path === "/api/projects/5/attachments" && !init?.method) return jsonResponse(200, list);
    if (path === "/api/projects/5/attachments" && init?.method === "POST") {
      const sent = init.body instanceof FormData ? init.body.get("file") : null;
      if (!(sent instanceof File)) return jsonResponse(400);
      if (sent.name === "recusado.pdf")
        return jsonResponse(400, { errors: { file: "Envie PDF, JPG, PNG ou ZIP." } });
      list.push(stored(8, sent.name, sent.type, sent.size));
      return jsonResponse(201, list.at(-1));
    }
    const target = path.match(/^\/api\/projects\/5\/attachments\/(\d+)$/);
    if (target && init?.method === "DELETE") {
      list.splice(
        list.findIndex((item) => item.id === Number(target[1])),
        1,
      );
      return jsonResponse(204);
    }
    return jsonResponse(500);
  });
}

const briefing = stored(7, "briefing.pdf", "application/pdf", 248 * 1024);

test("attachments card lists files with type, size and a download link", async () => {
  attachmentRoutes([briefing, stored(9, "mood.png", "image/png", 3 * 1024 * 1024 + 300_000)]);
  renderAt("/projetos/5/montagem");
  const card = (await screen.findByRole("heading", { name: "05 / Anexos" })).closest("section")!;
  const row = (await within(card).findByText("briefing.pdf")).closest<HTMLElement>(".file-row")!;
  expect(row).toHaveTextContent("PDF · 248 KB");
  expect(
    within(row).getByRole("link", { name: "Baixar briefing.pdf" }),
  ).toHaveAttribute("href", "/api/projects/5/attachments/7");
  expect(within(card).getByText("mood.png").closest(".file-row")).toHaveTextContent("PNG · 3,3 MB");
});

test("uploading a file posts it as multipart field file and lists it", async () => {
  const fetchSpy = attachmentRoutes([]);
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.upload(
    await screen.findByLabelText(/Escolher arquivos/),
    new File(["%PDF-1.7"], "novo.pdf", { type: "application/pdf" }),
  );
  expect(await screen.findByText("novo.pdf")).toBeInTheDocument();
  const post = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST");
  expect(post?.[0]).toBe("/api/projects/5/attachments");
  expect(post?.[1]?.body).toBeInstanceOf(FormData);
});

test("client precheck rejects bad type and oversized files without calling the server", async () => {
  const fetchSpy = attachmentRoutes([]);
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup({ applyAccept: false });
  const input = await screen.findByLabelText(/Escolher arquivos/);
  await user.upload(input, new File(["x"], "notas.txt", { type: "text/plain" }));
  expect(await screen.findByText("Envie PDF, JPG, PNG ou ZIP.")).toBeInTheDocument();
  await user.upload(
    input,
    new File([new Uint8Array(20 * 1024 * 1024 + 1)], "grande.zip", { type: "application/zip" }),
  );
  expect(await screen.findByText("Cada arquivo pode ter até 20 MB.")).toBeInTheDocument();
  expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("server rejection of an upload is shown", async () => {
  attachmentRoutes([]);
  renderAt("/projetos/5/montagem");
  await userEvent
    .setup()
    .upload(
      await screen.findByLabelText(/Escolher arquivos/),
      new File(["%PDF"], "recusado.pdf", { type: "application/pdf" }),
    );
  expect(await screen.findByText("Envie PDF, JPG, PNG ou ZIP.")).toBeInTheDocument();
  expect(screen.queryByText("recusado.pdf")).not.toBeInTheDocument();
});

test("removing an attachment deletes it and refreshes the list", async () => {
  const fetchSpy = attachmentRoutes([briefing]);
  renderAt("/projetos/5/montagem");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Remover briefing.pdf" }));
  await waitFor(() => expect(screen.queryByText("briefing.pdf")).not.toBeInTheDocument());
  expect(
    fetchSpy.mock.calls.some(
      ([path, init]) => path === "/api/projects/5/attachments/7" && init?.method === "DELETE",
    ),
  ).toBe(true);
});

test("archived project shows attachments read-only", async () => {
  attachmentRoutes([briefing], true);
  renderAt("/projetos/5/montagem");
  expect(await screen.findByText("briefing.pdf")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Baixar briefing.pdf" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remover briefing.pdf" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Escolher arquivos/)).not.toBeInTheDocument();
});

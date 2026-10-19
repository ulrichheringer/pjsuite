import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const stages = [
  {
    id: 1,
    name: "Descoberta",
    timing: "Até 05 out",
    deliverable: "Briefing aprovado",
    status: "pending",
    tasks: [
      { id: 10, title: "Kickoff", done: false },
      { id: 11, title: "Objetivos", done: true },
    ],
    files: [
      {
        id: 7,
        name: "briefing.pdf",
        contentType: "application/pdf",
        size: 2048,
        createdAt: "2026-10-01T10:00:00Z",
      },
    ],
  },
  {
    id: 2,
    name: "Entrega final",
    timing: "",
    deliverable: "",
    status: "done",
    tasks: [],
    files: [],
  },
];

const executionRoutes = (
  extra?: (path: string, init?: RequestInit) => Response | undefined,
  served: () => unknown = () => stages,
) =>
  mockFetch(
    (path, init) =>
      extra?.(path, init) ??
      (path === "/api/projects/5/execution" && !init?.method
        ? jsonResponse(200, served())
        : jsonResponse(500)),
  );

const stageSection = async (name: string) =>
  within((await screen.findByRole("heading", { name })).closest("section")!);

test("execution lists stages with status, checklist and files", async () => {
  executionRoutes();
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  expect(first.getByLabelText("Status de Descoberta")).toHaveValue("pending");
  expect(first.getByRole("checkbox", { name: "Kickoff" })).not.toBeChecked();
  expect(first.getByRole("checkbox", { name: "Objetivos" })).toBeChecked();
  expect(first.getByText("briefing.pdf")).toBeVisible();
  expect(first.getByRole("link", { name: "Baixar briefing.pdf" })).toHaveAttribute(
    "href",
    "/api/projects/5/stages/1/files/7",
  );
  const second = await stageSection("Entrega final");
  expect(second.getByLabelText("Status de Entrega final")).toHaveValue("done");
});

test("ticking a task saves done and reloads", async () => {
  const spy = executionRoutes((path, init) =>
    path === "/api/projects/5/tasks/10" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  await userEvent.click(first.getByRole("checkbox", { name: "Kickoff" }));

  const call = spy.mock.calls.find(([path]) => path === "/api/projects/5/tasks/10")!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ done: true });
});

test("adding and removing a task", async () => {
  const spy = executionRoutes((path, init) => {
    if (path === "/api/projects/5/stages/1/tasks" && init?.method === "POST")
      return jsonResponse(201, { id: 12, title: "Revisar", done: false });
    if (path === "/api/projects/5/tasks/11" && init?.method === "DELETE") return jsonResponse(204);
  });
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  await userEvent.type(first.getByLabelText("Nova tarefa em Descoberta"), "Revisar");
  await userEvent.click(first.getByRole("button", { name: "Adicionar tarefa" }));
  await userEvent.click(first.getByRole("button", { name: "Remover tarefa Objetivos" }));

  const add = spy.mock.calls.find(([path]) => path === "/api/projects/5/stages/1/tasks")!;
  expect(JSON.parse(String(add[1]?.body))).toEqual({ title: "Revisar" });
  expect(
    spy.mock.calls.some(
      ([path, init]) => path === "/api/projects/5/tasks/11" && init?.method === "DELETE",
    ),
  ).toBe(true);
});

test("changing the stage status saves it", async () => {
  const spy = executionRoutes((path, init) =>
    path === "/api/projects/5/stages/1/status" && init?.method === "PUT"
      ? jsonResponse(204)
      : undefined,
  );
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  await userEvent.selectOptions(first.getByLabelText("Status de Descoberta"), "in_progress");

  const call = spy.mock.calls.find(([path]) => path === "/api/projects/5/stages/1/status")!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ status: "in_progress" });
});

test("uploading a file to a stage posts the multipart body and a rejected type shows the problem", async () => {
  const spy = executionRoutes((path, init) =>
    path === "/api/projects/5/stages/2/files" && init?.method === "POST"
      ? jsonResponse(201, {})
      : undefined,
  );
  renderAt("/projetos/5/execucao");

  const second = await stageSection("Entrega final");
  const input = second.getByLabelText(/Escolher arquivos/);
  await userEvent.upload(input, new File(["%PDF"], "entrega.pdf", { type: "application/pdf" }));

  const call = spy.mock.calls.find(([path]) => path === "/api/projects/5/stages/2/files")!;
  const body = call[1]?.body;
  expect(body instanceof FormData && body.get("file")).toBeInstanceOf(File);

  await userEvent.upload(input, new File(["x"], "notas.txt"), { applyAccept: false });
  expect(await screen.findByText("Envie PDF, JPG, PNG ou ZIP.")).toBeVisible();
  expect(spy.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});

test("removing a stage file deletes it", async () => {
  const spy = executionRoutes((path, init) =>
    path === "/api/projects/5/stages/1/files/7" && init?.method === "DELETE"
      ? jsonResponse(204)
      : undefined,
  );
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  await userEvent.click(first.getByRole("button", { name: "Remover briefing.pdf" }));

  expect(
    spy.mock.calls.some(
      ([path, init]) => path === "/api/projects/5/stages/1/files/7" && init?.method === "DELETE",
    ),
  ).toBe(true);
});

test("execution shows the empty state without stages", async () => {
  executionRoutes(undefined, () => []);
  renderAt("/projetos/5/execucao");

  expect(await screen.findByText("Nenhuma etapa para acompanhar.")).toBeVisible();
});

test("execution shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/projetos/5/execucao");

  expect(await screen.findByText("Não foi possível carregar a execução.")).toBeVisible();
});

test("a failed task save shows the problem", async () => {
  executionRoutes((path, init) =>
    path === "/api/projects/5/tasks/10" && init?.method === "PUT" ? jsonResponse(500) : undefined,
  );
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  await userEvent.click(first.getByRole("checkbox", { name: "Kickoff" }));

  expect(await screen.findByText("Não foi possível salvar a alteração.")).toBeVisible();
});

test("a failed task add keeps the typed title", async () => {
  executionRoutes((path, init) =>
    path === "/api/projects/5/stages/1/tasks" && init?.method === "POST"
      ? jsonResponse(500)
      : undefined,
  );
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  const input = first.getByLabelText("Nova tarefa em Descoberta");
  await userEvent.type(input, "Revisar");
  await userEvent.click(first.getByRole("button", { name: "Adicionar tarefa" }));

  expect(await screen.findByText("Não foi possível adicionar a tarefa.")).toBeVisible();
  expect(input).toHaveValue("Revisar");
});

test("a rejected file is still reported when a later file uploads fine", async () => {
  executionRoutes((path, init) =>
    path === "/api/projects/5/stages/2/files" && init?.method === "POST"
      ? jsonResponse(201, {})
      : undefined,
  );
  renderAt("/projetos/5/execucao");

  const second = await stageSection("Entrega final");
  await userEvent.upload(
    second.getByLabelText(/Escolher arquivos/),
    [new File(["x"], "notas.txt"), new File(["%PDF"], "entrega.pdf", { type: "application/pdf" })],
    { applyAccept: false },
  );

  expect(await screen.findByText("Envie PDF, JPG, PNG ou ZIP.")).toBeVisible();
});

test("renaming a task saves the new title", async () => {
  const spy = executionRoutes((path, init) =>
    path === "/api/projects/5/tasks/10" && init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  renderAt("/projetos/5/execucao");

  const first = await stageSection("Descoberta");
  await userEvent.click(first.getByRole("button", { name: "Renomear tarefa Kickoff" }));
  const input = first.getByLabelText("Novo nome da tarefa Kickoff");
  await userEvent.clear(input);
  await userEvent.type(input, "Reunião inicial{Enter}");

  const call = spy.mock.calls.find(([path]) => path === "/api/projects/5/tasks/10")!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({ title: "Reunião inicial" });
});

const projectRoutes = (status: string) =>
  mockFetch((path) => {
    if (path === "/api/projects/5")
      return jsonResponse(200, {
        id: 5,
        clientId: 1,
        clientName: "Ana Lima",
        name: "Ensaio de marca",
        area: "Design",
        reference: "",
        goal: "",
        structure: "essential",
        status,
        archived: false,
        scope: "",
        outcome: "",
        notes: "",
      });
    if (path === "/api/clients")
      return jsonResponse(200, [
        {
          id: 1,
          name: "Ana Lima",
          email: "ana@example.com",
          phone: "",
          company: "",
          notes: "",
          stage: "active",
          archived: false,
        },
      ]);
    return jsonResponse(500);
  });

test("the project page links to the execution only when signed", async () => {
  projectRoutes("signed");
  renderAt("/projetos/5");
  expect(await screen.findByRole("link", { name: /Acompanhar execução/ })).toHaveAttribute(
    "href",
    "/projetos/5/execucao",
  );
});

test("the project page has no execution link before signing", async () => {
  projectRoutes("sent");
  renderAt("/projetos/5");
  expect(await screen.findByRole("heading", { name: "Detalhes do projeto" })).toBeVisible();
  expect(screen.queryByRole("link", { name: /Acompanhar execução/ })).toBeNull();
});

test("execution links to publishing the delivery", async () => {
  executionRoutes();
  renderAt("/projetos/5/execucao");

  expect(await screen.findByRole("link", { name: "Publicar entrega" })).toHaveAttribute(
    "href",
    "/projetos/5/entrega",
  );
});

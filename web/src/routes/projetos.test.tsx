import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const project = (id: number, name: string, clientName: string, extra = {}) => ({
  id,
  clientId: 1,
  clientName,
  name,
  area: "Fotografia",
  reference: "",
  goal: "",
  structure: "essential",
  status: "draft",
  archived: false,
  scope: "",
  outcome: "",
  notes: "",
  ...extra,
});

const active = [
  project(1, "Ensaio de marca", "Ana Lima", { reference: "PJ-7" }),
  project(2, "Site institucional", "Bruno Costa"),
];
const archived = [project(3, "Álbum antigo", "Carla Dias", { archived: true })];

const listing = (path: string) =>
  path === "/api/projects?archived=1" ? jsonResponse(200, archived) : jsonResponse(200, active);

test("lists active projects, then archived ones under the tab", async () => {
  mockFetch(listing);
  renderAt("/projetos");
  expect(await screen.findByText("Ensaio de marca")).toBeInTheDocument();
  expect(screen.getByText("Ana Lima")).toBeInTheDocument();
  expect(screen.getAllByText("Rascunho")).toHaveLength(2);
  expect(screen.queryByText("Álbum antigo")).not.toBeInTheDocument();

  await userEvent.setup().click(screen.getByRole("tab", { name: /Arquivados/ }));
  expect(screen.getByText("Álbum antigo")).toBeInTheDocument();
  expect(screen.queryByText("Ensaio de marca")).not.toBeInTheDocument();
});

test("search filters by name, client or reference", async () => {
  mockFetch(listing);
  renderAt("/projetos");
  const search = await screen.findByLabelText("Buscar projeto");
  const user = userEvent.setup();
  await user.type(search, "bruno");
  expect(screen.getByText("Site institucional")).toBeInTheDocument();
  expect(screen.queryByText("Ensaio de marca")).not.toBeInTheDocument();
  await user.clear(search);
  await user.type(search, "pj-7");
  expect(screen.getByText("Ensaio de marca")).toBeInTheDocument();
  expect(screen.queryByText("Site institucional")).not.toBeInTheDocument();
  await user.clear(search);
  await user.type(search, "inexistente");
  expect(screen.getByText("Nenhum projeto encontrado.")).toBeInTheDocument();
});

test("shows the empty state without projects", async () => {
  mockFetch(() => jsonResponse(200, []));
  renderAt("/projetos");
  expect(await screen.findByText("Um bom projeto começa com um combinado.")).toBeInTheDocument();
});

test("shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/projetos");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar os projetos.",
  );
});

test("redirects to /entrar on 401", async () => {
  mockFetch(() => jsonResponse(401));
  const router = renderAt("/projetos");
  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
});

const client = (id: number, name: string) => ({
  id,
  name,
  email: "",
  phone: "",
  company: "",
  notes: "",
  stage: "recent",
  archived: false,
});

const clientList = [client(1, "Ana Lima"), client(2, "Bruno Costa")];

test("new project form offers only active clients and posts the structure", async () => {
  const fetchSpy = mockFetch((path, init) => {
    if (path === "/api/clients") return jsonResponse(200, clientList);
    if (init?.method === "POST") return jsonResponse(201, project(9, "Ensaio novo", "Bruno Costa"));
    return jsonResponse(200, []);
  });
  const router = renderAt("/projetos/novo");
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Nome do projeto/), "Ensaio novo");
  await screen.findByRole("option", { name: "Bruno Costa" });
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
    "Ana Lima",
    "Bruno Costa",
  ]);
  expect(fetchSpy.mock.calls.map(([path]) => path)).not.toContain("/api/clients?archived=1");
  await user.selectOptions(screen.getByLabelText("Cliente"), "Bruno Costa");
  await user.click(screen.getByRole("button", { name: /Estrutura sugerida/ }));
  await user.type(screen.getByLabelText(/Referência interna/), "PJ-9");
  await user.click(screen.getByRole("button", { name: /Criar e montar projeto/ }));

  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/projetos/9/montagem"));
  const post = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(post[0]).toBe("/api/projects");
  expect(JSON.parse(String(post[1]?.body))).toMatchObject({
    name: "Ensaio novo",
    clientId: 2,
    structure: "suggested",
    reference: "PJ-9",
  });
  expect(router.state.location.search).toEqual({});
});

test("new project form defaults to the essential structure", async () => {
  const fetchSpy = mockFetch((path, init) => {
    if (path === "/api/clients") return jsonResponse(200, clientList);
    if (init?.method === "POST") return jsonResponse(201, project(9, "X", "Ana Lima"));
    return jsonResponse(200, []);
  });
  renderAt("/projetos/novo");
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Nome do projeto/), "X");
  await screen.findByRole("option", { name: "Ana Lima" });
  await user.click(screen.getByRole("button", { name: /Criar e montar projeto/ }));
  await vi.waitFor(() =>
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true),
  );
  const post = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(JSON.parse(String(post[1]?.body))).toMatchObject({ clientId: 1, structure: "essential" });
});

test("new project form shows server field errors and stays", async () => {
  mockFetch((path, init) => {
    if (path === "/api/clients") return jsonResponse(200, clientList);
    if (init?.method === "POST") {
      return jsonResponse(400, {
        errors: { name: "Informe o nome do projeto (até 120 caracteres)." },
      });
    }
    return jsonResponse(200, []);
  });
  const router = renderAt("/projetos/novo");
  await screen.findByRole("option", { name: "Ana Lima" });
  await userEvent.setup().click(screen.getByRole("button", { name: /Criar e montar projeto/ }));
  expect(
    await screen.findByText("Informe o nome do projeto (até 120 caracteres)."),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/projetos/novo");
});

const editing = project(5, "Ensaio de marca", "Bruno Costa", {
  clientId: 2,
  area: "Design",
  reference: "PJ-7",
  goal: "Identidade visual",
  structure: "suggested",
});

const editRoutes = (extra?: (path: string, init?: RequestInit) => Response | undefined) =>
  mockFetch((path, init) => {
    if (path === "/api/clients") return jsonResponse(200, clientList);
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, editing);
    return extra?.(path, init) ?? jsonResponse(200, []);
  });

test("edit form is prefilled, shows the version note and hides the structure", async () => {
  editRoutes();
  renderAt("/projetos/5");
  expect(await screen.findByLabelText(/Nome do projeto/)).toHaveValue("Ensaio de marca");
  await vi.waitFor(() => expect(screen.getByLabelText("Cliente")).toHaveValue("2"));
  expect(screen.getByLabelText(/Referência interna/)).toHaveValue("PJ-7");
  expect(screen.getByLabelText("Objetivo do projeto")).toHaveValue("Identidade visual");
  expect(screen.getByText("Alterações comerciais geram uma nova versão.")).toBeInTheDocument();
  expect(screen.queryByText("Como você quer começar a montagem?")).not.toBeInTheDocument();
});

test("edit form saves the changes without the structure", async () => {
  const fetchSpy = editRoutes((_, init) =>
    init?.method === "PUT" ? jsonResponse(204) : undefined,
  );
  const router = renderAt("/projetos/5");
  const user = userEvent.setup();
  const name = await screen.findByLabelText(/Nome do projeto/);
  await vi.waitFor(() => expect(screen.getByLabelText("Cliente")).toHaveValue("2"));
  await user.clear(name);
  await user.type(name, "Marca nova");
  await user.selectOptions(screen.getByLabelText("Cliente"), "Ana Lima");
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/projetos/5/montagem"));
  const put = fetchSpy.mock.calls.find(([, init]) => init?.method === "PUT")!;
  expect(put[0]).toBe("/api/projects/5");
  const body = JSON.parse(String(put[1]?.body));
  expect(body).toMatchObject({
    name: "Marca nova",
    clientId: 1,
    area: "Design",
    reference: "PJ-7",
  });
  expect(body).not.toHaveProperty("structure");
});

test("an archived project opens read-only", async () => {
  mockFetch((path) =>
    path === "/api/projects/5"
      ? jsonResponse(200, { ...editing, archived: true })
      : jsonResponse(200, clientList),
  );
  renderAt("/projetos/5");
  expect(await screen.findByText("Projeto arquivado.")).toBeInTheDocument();
  expect(screen.getByLabelText(/Nome do projeto/)).toBeDisabled();
  expect(screen.getByLabelText("Área do trabalho")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Salvar alterações" })).not.toBeInTheDocument();
});

async function openMenu(name: string, item: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `Ações de ${name}` }));
  await user.click(screen.getByRole("menuitem", { name: item }));
}

test("duplicating posts the default name and shows the new card", async () => {
  const copy = project(10, "Ensaio de marca — cópia", "Ana Lima");
  const fetchSpy = mockFetch((path) => {
    if (path === "/api/clients") return jsonResponse(200, clientList);
    if (path === "/api/projects/1/duplicate") return jsonResponse(201, copy);
    return listing(path);
  });
  renderAt("/projetos");
  await screen.findByText("Ensaio de marca");
  await openMenu("Ensaio de marca", "Duplicar projeto");

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("Nome do novo projeto")).toHaveValue(
    "Ensaio de marca — cópia",
  );
  await within(dialog).findByRole("option", { name: "Bruno Costa" });
  await userEvent
    .setup()
    .click(within(dialog).getByRole("button", { name: /Duplicar como rascunho/ }));

  expect(await screen.findByText("Projeto criado.")).toBeInTheDocument();
  expect(screen.getByText("Ensaio de marca — cópia")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const post = fetchSpy.mock.calls.find(([path]) => path === "/api/projects/1/duplicate")!;
  expect(JSON.parse(String(post[1]?.body))).toEqual({
    name: "Ensaio de marca — cópia",
    clientId: 1,
  });
});

test("duplicating lets the name and client be changed", async () => {
  const fetchSpy = mockFetch((path) => {
    if (path === "/api/clients") return jsonResponse(200, clientList);
    if (path === "/api/projects/1/duplicate")
      return jsonResponse(201, project(10, "Outro", "Bruno Costa"));
    return listing(path);
  });
  renderAt("/projetos");
  await screen.findByText("Ensaio de marca");
  await openMenu("Ensaio de marca", "Duplicar projeto");
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("option", { name: "Bruno Costa" });
  const user = userEvent.setup();
  await user.clear(within(dialog).getByLabelText("Nome do novo projeto"));
  await user.type(within(dialog).getByLabelText("Nome do novo projeto"), "Outro");
  await user.selectOptions(within(dialog).getByLabelText("Cliente"), "Bruno Costa");
  await user.click(within(dialog).getByRole("button", { name: /Duplicar como rascunho/ }));
  await screen.findByText("Projeto criado.");
  const post = fetchSpy.mock.calls.find(([path]) => path === "/api/projects/1/duplicate")!;
  expect(JSON.parse(String(post[1]?.body))).toEqual({ name: "Outro", clientId: 2 });
});

test("Manter ativo closes the dialog without calling the API", async () => {
  const fetchSpy = mockFetch(listing);
  renderAt("/projetos");
  await screen.findByText("Ensaio de marca");
  await openMenu("Ensaio de marca", "Arquivar projeto");
  const dialog = await screen.findByRole("alertdialog");
  expect(dialog).toHaveTextContent("Arquivar este projeto?");
  await userEvent.setup().click(within(dialog).getByRole("button", { name: "Manter ativo" }));
  await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  expect(screen.getByText("Ensaio de marca")).toBeInTheDocument();
});

test("confirming archives the project and lists it under Arquivados", async () => {
  const fetchSpy = mockFetch((path, init) =>
    path === "/api/projects/1/archive" && init?.method === "POST"
      ? jsonResponse(204)
      : listing(path),
  );
  renderAt("/projetos");
  await screen.findByText("Ensaio de marca");
  await openMenu("Ensaio de marca", "Arquivar projeto");
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.setup().click(within(dialog).getByRole("button", { name: "Arquivar projeto" }));

  await vi.waitFor(() => expect(screen.queryByText("Ensaio de marca")).not.toBeInTheDocument());
  expect(fetchSpy.mock.calls.some(([path]) => path === "/api/projects/1/archive")).toBe(true);
  await userEvent.setup().click(screen.getByRole("tab", { name: /Arquivados/ }));
  expect(screen.getByText("Ensaio de marca")).toBeInTheDocument();
});

test("a failed archive keeps the card and shows an error", async () => {
  mockFetch((path, init) => (init?.method === "POST" ? jsonResponse(500) : listing(path)));
  renderAt("/projetos");
  await screen.findByText("Ensaio de marca");
  await openMenu("Ensaio de marca", "Arquivar projeto");
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.setup().click(within(dialog).getByRole("button", { name: "Arquivar projeto" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível arquivar o projeto.",
  );
  expect(screen.getByText("Ensaio de marca")).toBeInTheDocument();
});

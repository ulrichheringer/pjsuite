import { screen } from "@testing-library/react";
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
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Ana Lima", "Bruno Costa"]);
  expect(fetchSpy.mock.calls.map(([path]) => path)).not.toContain("/api/clients?archived=1");
  await user.selectOptions(screen.getByLabelText("Cliente"), "Bruno Costa");
  await user.click(screen.getByRole("button", { name: /Estrutura sugerida/ }));
  await user.type(screen.getByLabelText(/Referência interna/), "PJ-9");
  await user.click(screen.getByRole("button", { name: /Criar e montar projeto/ }));

  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/projetos"));
  const post = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(post[0]).toBe("/api/projects");
  expect(JSON.parse(String(post[1]?.body))).toMatchObject({
    name: "Ensaio novo",
    clientId: 2,
    structure: "suggested",
    reference: "PJ-9",
  });
  expect(await screen.findByText("Projeto criado.")).toBeInTheDocument();
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

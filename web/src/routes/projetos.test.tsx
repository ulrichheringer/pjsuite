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

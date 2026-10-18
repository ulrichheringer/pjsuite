import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const client = (id: number, name: string, stage: string, extra = {}) => ({
  id,
  name,
  email: `${name.split(" ")[0]!.toLowerCase()}@example.com`,
  phone: "",
  company: "",
  notes: "",
  stage,
  archived: false,
  ...extra,
});

const clients = [
  client(1, "Ana Lima", "recent"),
  client(2, "Bruno Costa", "proposal", { company: "Costa Filmes" }),
  client(3, "Carla Dias", "active"),
];

test("board shows each client in its stage column", async () => {
  mockFetch(() => jsonResponse(200, clients));
  renderAt("/clientes");
  const recent = await screen.findByRole("region", { name: "Contato recente" });
  expect(within(recent).getByText("Ana Lima")).toBeInTheDocument();
  expect(within(recent).queryByText("Bruno Costa")).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("region", { name: "Proposta enviada" })).getByText("Bruno Costa"),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("region", { name: "Projeto ativo" })).getByText("Carla Dias"),
  ).toBeInTheDocument();
});

test("search filters by name, email or company", async () => {
  mockFetch(() => jsonResponse(200, clients));
  renderAt("/clientes");
  const search = await screen.findByLabelText("Buscar cliente");
  const user = userEvent.setup();
  await user.type(search, "costa filmes");
  expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
  expect(screen.queryByText("Ana Lima")).not.toBeInTheDocument();
  await user.clear(search);
  await user.type(search, "carla@");
  expect(screen.getByText("Carla Dias")).toBeInTheDocument();
  expect(screen.queryByText("Bruno Costa")).not.toBeInTheDocument();
});

test("shows the empty state without clients", async () => {
  mockFetch(() => jsonResponse(200, []));
  renderAt("/clientes");
  expect(await screen.findByText("Nenhum cliente ainda.")).toBeInTheDocument();
});

test("shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/clientes");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar os clientes.",
  );
});

test("redirects to /entrar on 401", async () => {
  mockFetch((path) => (path === "/api/clients" ? jsonResponse(401) : jsonResponse(200, {})));
  const router = renderAt("/clientes");
  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
});

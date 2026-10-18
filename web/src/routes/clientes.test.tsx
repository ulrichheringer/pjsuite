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

test("new client form posts the data and returns to the board", async () => {
  const fetchSpy = mockFetch((_, init) =>
    init?.method === "POST"
      ? jsonResponse(201, client(9, "Dora Reis", "recent"))
      : jsonResponse(200, []),
  );
  const router = renderAt("/clientes/novo");
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Nome/), "Dora Reis");
  await user.type(screen.getByLabelText("E-mail"), "dora@example.com");
  await user.type(screen.getByLabelText("Observações internas"), "Indicação da Ana.");
  await user.click(screen.getByRole("button", { name: /Criar cliente/ }));
  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/clientes"));
  const post = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(post[0]).toBe("/api/clients");
  expect(JSON.parse(String(post[1]?.body))).toMatchObject({
    name: "Dora Reis",
    email: "dora@example.com",
    notes: "Indicação da Ana.",
  });
});

test("new client form shows server field errors and stays", async () => {
  mockFetch(() => jsonResponse(400, { errors: { email: "Confira o e-mail." } }));
  const router = renderAt("/clientes/novo");
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Nome/), "Dora");
  await user.click(screen.getByRole("button", { name: /Criar cliente/ }));
  expect(await screen.findByText("Confira o e-mail.")).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/clientes/novo");
});

test("board links to the new client form", async () => {
  mockFetch(() => jsonResponse(200, clients));
  const router = renderAt("/clientes");
  await userEvent.click(await screen.findByRole("link", { name: /Novo cliente/ }));
  await vi.waitFor(() => expect(router.state.location.pathname).toBe("/clientes/novo"));
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, accept = true) {
  await user.type(await screen.findByLabelText(/Seu nome/), "Helena Duarte");
  await user.type(screen.getByLabelText(/E-mail/), "helena@example.com");
  await user.type(screen.getByLabelText(/Senha/), "senha-segura");
  if (accept) await user.click(screen.getByRole("checkbox", { name: /Li e aceito os termos/ }));
  await user.click(screen.getByRole("button", { name: "Criar minha conta" }));
}

test("signup success posts the form and goes to /perfil", async () => {
  const fetchSpy = mockFetch((path) =>
    path === "/api/signup" ? jsonResponse(201) : jsonResponse(401, { errors: {} }),
  );
  const router = renderAt("/cadastro");
  const user = userEvent.setup();
  await fillAndSubmit(user);
  await waitFor(() => expect(router.state.location.pathname).toBe("/perfil"));
  expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
    name: "Helena Duarte",
    email: "helena@example.com",
    password: "senha-segura",
    acceptTerms: true,
  });
});

test("duplicate email shows inline error", async () => {
  mockFetch(() => jsonResponse(409, { errors: { email: "E-mail já cadastrado" } }));
  const router = renderAt("/cadastro");
  await fillAndSubmit(userEvent.setup());
  expect(await screen.findByText("E-mail já cadastrado")).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/cadastro");
});

test("validation errors from the server show inline", async () => {
  mockFetch(() => jsonResponse(400, { errors: { acceptTerms: "Aceite os termos para continuar." } }));
  renderAt("/cadastro");
  await fillAndSubmit(userEvent.setup(), false);
  expect(await screen.findByText("Aceite os termos para continuar.")).toBeInTheDocument();
});

test("submit button shows loading while the request is pending", async () => {
  mockFetch(() => new Promise(() => {}));
  renderAt("/cadastro");
  await fillAndSubmit(userEvent.setup());
  expect(await screen.findByRole("button", { name: /Criando/ })).toBeDisabled();
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/E-mail/), "helena@example.com");
  await user.type(screen.getByLabelText(/Senha/), "senha-segura");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

test("login success goes to /", async () => {
  const fetchSpy = mockFetch(() => jsonResponse(204));
  const router = renderAt("/entrar");
  await fillAndSubmit(userEvent.setup());
  await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  expect(fetchSpy.mock.calls[0][0]).toBe("/api/login");
});

test("401 shows the generic error banner and stays", async () => {
  mockFetch(() => jsonResponse(401, { errors: { form: "E-mail ou senha incorretos." } }));
  const router = renderAt("/entrar");
  await fillAndSubmit(userEvent.setup());
  expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
  expect(router.state.location.pathname).toBe("/entrar");
});

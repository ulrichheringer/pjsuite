import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const profile = {
  name: "Helena Duarte",
  businessName: "Helena Duarte Fotografia",
  contactEmail: "helena@example.com",
  phone: "(31) 99900-0124",
  area: "Fotografia",
  city: "Belo Horizonte, MG",
  bio: "Fotografia afetiva.",
  hasAvatar: false,
};

test("loads the profile into the form", async () => {
  mockFetch(() => jsonResponse(200, profile));
  renderAt("/perfil");
  expect(await screen.findByLabelText(/Nome profissional/)).toHaveValue("Helena Duarte");
  expect(screen.getByLabelText("Nome do negócio")).toHaveValue("Helena Duarte Fotografia");
  expect(screen.getByLabelText("Cidade")).toHaveValue("Belo Horizonte, MG");
});

test("saves edits and shows the success banner", async () => {
  const fetchSpy = mockFetch((_, init) =>
    init?.method === "PUT" ? jsonResponse(204) : jsonResponse(200, profile),
  );
  renderAt("/perfil");
  const user = userEvent.setup();
  const name = await screen.findByLabelText(/Nome profissional/);
  await user.clear(name);
  await user.type(name, "Helena D.");
  await user.click(screen.getByRole("button", { name: /Salvar perfil/ }));
  expect(await screen.findByText("Perfil salvo.")).toBeInTheDocument();
  const put = fetchSpy.mock.calls.find(([, init]) => init?.method === "PUT")!;
  expect(JSON.parse(String(put[1]?.body))).toMatchObject({ name: "Helena D.", area: "Fotografia" });
});

test("shows server validation errors inline", async () => {
  mockFetch((_, init) =>
    init?.method === "PUT"
      ? jsonResponse(400, { errors: { contactEmail: "Confira seu e-mail." } })
      : jsonResponse(200, profile),
  );
  renderAt("/perfil");
  await userEvent.click(await screen.findByRole("button", { name: /Salvar perfil/ }));
  expect(await screen.findByText("Confira seu e-mail.")).toBeInTheDocument();
});

test("uploads an avatar", async () => {
  const fetchSpy = mockFetch((path) =>
    path === "/api/profile/avatar" ? jsonResponse(204) : jsonResponse(200, profile),
  );
  renderAt("/perfil");
  const file = new File(["x"], "me.png", { type: "image/png" });
  await userEvent.upload(await screen.findByLabelText(/Enviar foto/), file);
  await waitFor(() =>
    expect(
      fetchSpy.mock.calls.some(([p, i]) => p === "/api/profile/avatar" && i?.body === file),
    ).toBe(true),
  );
});

test("avatar rejected by the server shows an error", async () => {
  mockFetch((path) =>
    path === "/api/profile/avatar" ? jsonResponse(413) : jsonResponse(200, profile),
  );
  renderAt("/perfil");
  await userEvent.upload(
    await screen.findByLabelText(/Enviar foto/),
    new File(["x"], "me.png", { type: "image/png" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("até 2 MB");
});

test("redirects to /entrar on 401", async () => {
  mockFetch(() => jsonResponse(401));
  const router = renderAt("/perfil");
  await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
});

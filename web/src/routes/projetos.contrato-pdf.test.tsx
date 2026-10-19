import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const content = {
  project: "Ensaio de marca",
  professional: { name: "Helena Duarte", company: "Helena Foto", email: "helena@example.com" },
  client: { name: "Ana Lima", email: "ana@example.com" },
  scope: { scope: "Retratos em estúdio", outcome: "" },
};

const contract = { number: 1, hash: "h", createdAt: "2026-10-18T00:00:00Z", content };

test("pdf view renders the stored version and prints", async () => {
  mockFetch((path) =>
    path === "/api/projects/5/contract/1" ? jsonResponse(200, contract) : jsonResponse(500),
  );
  const print = vi.fn();
  vi.stubGlobal("print", print);
  renderAt("/projetos/5/contrato/1");

  expect(await screen.findByText("CONTRATO / V1")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Ensaio de marca" })).toBeVisible();
  expect(screen.getByText("Retratos em estúdio")).toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: /Imprimir \/ salvar PDF/ }));
  expect(print).toHaveBeenCalledTimes(1);
});

test("pdf view shows an error when the version does not exist", async () => {
  mockFetch(() => jsonResponse(404));
  renderAt("/projetos/5/contrato/9");

  expect(await screen.findByText("Não foi possível abrir o contrato.")).toBeVisible();
  expect(screen.queryByText(/CONTRATO \/ V/)).toBeNull();
  expect(screen.queryByRole("button", { name: /Imprimir/ })).toBeNull();
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const project = {
  id: 5,
  clientId: 1,
  clientName: "Ana Lima",
  name: "Ensaio de marca",
  area: "Design",
  reference: "",
  goal: "",
  structure: "essential",
  status: "sent",
  archived: false,
  scope: "",
  outcome: "",
  notes: "",
};

const link = { token: "TOK", url: "/p/TOK", viewedAt: null, request: null };

const shareRoutes = (
  status: string,
  share: () => Response,
  extra?: (path: string, init?: RequestInit) => Response | undefined,
) =>
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method)
      return jsonResponse(200, { ...project, status });
    if (path === "/api/projects/5/share" && !init?.method) return share();
    return extra?.(path, init) ?? jsonResponse(500);
  });

test("share screen shows the link and copies it", async () => {
  shareRoutes("sent", () => jsonResponse(200, link));
  const user = userEvent.setup();
  renderAt("/projetos/5/compartilhar");

  const field = await screen.findByLabelText("Link de revisão");
  expect(field).toHaveValue(`${window.location.origin}/p/TOK`);
  expect(screen.getByText("Enviado")).toBeVisible();

  await user.click(screen.getByRole("button", { name: /Copiar link/ }));
  expect(await screen.findByText("Link copiado.")).toBeVisible();
  expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/p/TOK`);
});

test("a finalized project without a link generates one", async () => {
  let created = false;
  shareRoutes(
    "final",
    () => (created ? jsonResponse(200, link) : jsonResponse(404)),
    (path, init) => {
      if (path === "/api/projects/5/share" && init?.method === "POST") {
        created = true;
        return jsonResponse(200, link);
      }
    },
  );
  renderAt("/projetos/5/compartilhar");

  await userEvent.click(await screen.findByRole("button", { name: /Gerar link/ }));
  expect(await screen.findByLabelText("Link de revisão")).toHaveValue(
    `${window.location.origin}/p/TOK`,
  );
});

test("a viewed link shows Visto and the latest client request", async () => {
  shareRoutes("changes_requested", () =>
    jsonResponse(200, {
      ...link,
      viewedAt: "2026-10-18T12:00:00Z",
      request: {
        kind: "change",
        message: "Trocar prazo",
        version: 1,
        createdAt: "2026-10-18T13:00:00Z",
      },
    }),
  );
  renderAt("/projetos/5/compartilhar");

  expect(await screen.findByText("Alteração solicitada")).toBeVisible();
  expect(screen.getByRole("listitem")).toHaveTextContent("Visto pelo cliente");
  expect(screen.getByText("Trocar prazo")).toBeVisible();
});

test("regenerating shows the new link", async () => {
  shareRoutes(
    "sent",
    () => jsonResponse(200, link),
    (path, init) => {
      if (path === "/api/projects/5/share/regenerate" && init?.method === "POST")
        return jsonResponse(200, { ...link, token: "NOVO", url: "/p/NOVO" });
    },
  );
  renderAt("/projetos/5/compartilhar");

  await userEvent.click(await screen.findByRole("button", { name: /Gerar novo link/ }));
  await waitFor(() =>
    expect(screen.getByLabelText("Link de revisão")).toHaveValue(
      `${window.location.origin}/p/NOVO`,
    ),
  );
});

test("a draft project asks to finalize the contract first", async () => {
  shareRoutes("draft", () => jsonResponse(404));
  renderAt("/projetos/5/compartilhar");

  expect(await screen.findByText("Finalize o contrato antes de compartilhar.")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Gerar link/ })).toBeNull();
});

test("a failed clipboard write shows an error instead of copied", async () => {
  shareRoutes("sent", () => jsonResponse(200, link));
  const user = userEvent.setup();
  renderAt("/projetos/5/compartilhar");
  await screen.findByLabelText("Link de revisão");
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));

  await user.click(screen.getByRole("button", { name: /Copiar link/ }));

  expect(await screen.findByText("Não foi possível copiar o link.")).toBeVisible();
  expect(screen.queryByText("Link copiado.")).toBeNull();
});

test("a change request links to the revision screen", async () => {
  shareRoutes("changes_requested", () =>
    jsonResponse(200, {
      ...link,
      request: { kind: "change", message: "Trocar prazo", version: 1, createdAt: "x" },
    }),
  );
  renderAt("/projetos/5/compartilhar");

  expect(await screen.findByRole("link", { name: /Ajustar e reenviar/ })).toHaveAttribute(
    "href",
    "/projetos/5/revisao",
  );
});

test("a signed project shows Assinado and offers no new link or revision", async () => {
  shareRoutes("signed", () => jsonResponse(200, link));
  renderAt("/projetos/5/compartilhar");

  expect(await screen.findByText("Contrato assinado.")).toBeVisible();
  expect(screen.getAllByText("Assinado").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Gerar novo link/ })).toBeNull();
  expect(screen.queryByRole("link", { name: /Ajustar e reenviar/ })).toBeNull();
});

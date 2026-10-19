import { screen, waitFor, within } from "@testing-library/react";
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
  status: "draft",
  archived: false,
  scope: "Retratos em estúdio",
  outcome: "Galeria publicada",
  notes: "Conferir bateria",
};

const blocks = ["scope", "stages", "deliverables", "price", "attachments"] as const;

const clientView = (visible: Record<string, boolean>) => ({
  project: "Ensaio de marca",
  professional: { name: "Helena Duarte", company: "Helena Foto", email: "helena@example.com" },
  client: { name: "Ana Lima", email: "ana@example.com" },
  ...(visible.scope && { scope: { scope: "Retratos em estúdio", outcome: "Galeria publicada" } }),
  ...(visible.stages && {
    stages: [{ name: "Descoberta", timingKind: "deadline", timing: "Até 05 out" }],
  }),
  ...(visible.deliverables && {
    deliverables: [{ stage: "Descoberta", text: "Briefing aprovado" }],
  }),
  ...(visible.price && {
    price: {
      priceCents: 150000,
      payments: [{ kind: "unico", percent: 100, trigger: "assinatura", due: "Na assinatura" }],
    },
  }),
  ...(visible.attachments && {
    attachments: [{ name: "briefing.pdf", contentType: "application/pdf", size: 2048 }],
  }),
});

function visibilityRoutes() {
  const visible: Record<string, boolean> = Object.fromEntries(blocks.map((b) => [b, true]));
  const spy = mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/visibility" && !init?.method) return jsonResponse(200, visible);
    if (path === "/api/projects/5/visibility" && init?.method === "PUT") {
      Object.assign(visible, JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    }
    if (path === "/api/projects/5/client-view") return jsonResponse(200, clientView(visible));
    return jsonResponse(500);
  });
  return spy;
}

test("visibility screen labels each block and shows all of them in the preview", async () => {
  visibilityRoutes();
  renderAt("/projetos/5/visibilidade");

  const preview = (await screen.findByText("ASSIM O CLIENTE VÊ")).closest(".client-preview")!;
  await within(preview as HTMLElement).findByText("Retratos em estúdio");
  for (const heading of ["Investimento", "Arquivos do projeto"]) {
    expect(within(preview as HTMLElement).getByRole("heading", { name: heading })).toBeVisible();
  }
  expect(within(preview as HTMLElement).getByText("Ensaio de marca")).toBeVisible();
  expect(within(preview as HTMLElement).queryByText("Conferir bateria")).toBeNull();

  const price = screen.getByRole("switch", { name: /Preço e condições/ });
  expect(price).toBeChecked();
  expect(screen.getAllByText("Visível para o cliente")).toHaveLength(5);
  expect(screen.queryByRole("switch", { name: /Notas internas|Tarefas/ })).toBeNull();
});

test("toggling a block saves it and hides it from the preview", async () => {
  const spy = visibilityRoutes();
  renderAt("/projetos/5/visibilidade");

  const preview = (await screen.findByText("ASSIM O CLIENTE VÊ")).closest(".client-preview")!;
  await within(preview as HTMLElement).findByRole("heading", { name: "Investimento" });

  await userEvent.click(screen.getByRole("switch", { name: /Preço e condições/ }));

  await waitFor(() =>
    expect(
      within(preview as HTMLElement).queryByRole("heading", { name: "Investimento" }),
    ).toBeNull(),
  );
  const put = spy.mock.calls.find(([, init]) => init?.method === "PUT")!;
  expect(put[0]).toBe("/api/projects/5/visibility");
  expect(JSON.parse(String(put[1]?.body))).toEqual({ price: false });
  expect(screen.getByRole("switch", { name: /Preço e condições/ })).not.toBeChecked();
  expect(screen.getByText("Só você vê")).toBeVisible();
  expect(within(preview as HTMLElement).getByText("Retratos em estúdio")).toBeVisible();
});

test("overlapping saves keep every toggle and lock the pending switch", async () => {
  const visible: Record<string, boolean> = Object.fromEntries(blocks.map((b) => [b, true]));
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  mockFetch(async (path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/visibility" && !init?.method) return jsonResponse(200, visible);
    if (path === "/api/projects/5/visibility" && init?.method === "PUT") {
      const patch = JSON.parse(String(init.body));
      if ("scope" in patch) await held;
      Object.assign(visible, patch);
      return new Response(null, { status: 204 });
    }
    if (path === "/api/projects/5/client-view") return jsonResponse(200, clientView(visible));
    return jsonResponse(500);
  });
  renderAt("/projetos/5/visibilidade");

  await userEvent.click(await screen.findByRole("switch", { name: /Escopo/ }));
  expect(screen.getByRole("switch", { name: /Escopo/ })).toBeDisabled();
  await userEvent.click(screen.getByRole("switch", { name: /Preço e condições/ }));
  await waitFor(() =>
    expect(screen.getByRole("switch", { name: /Preço e condições/ })).not.toBeChecked(),
  );
  release();

  await waitFor(() => expect(screen.getByRole("switch", { name: /Escopo/ })).not.toBeChecked());
  expect(screen.getByRole("switch", { name: /Escopo/ })).toBeEnabled();
  expect(screen.getByRole("switch", { name: /Preço e condições/ })).not.toBeChecked();
});

test("a failed save keeps the switch and shows an error", async () => {
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/visibility" && !init?.method)
      return jsonResponse(200, Object.fromEntries(blocks.map((b) => [b, true])));
    if (path === "/api/projects/5/client-view")
      return jsonResponse(200, clientView({ price: true }));
    return jsonResponse(500);
  });
  renderAt("/projetos/5/visibilidade");
  await userEvent.click(await screen.findByRole("switch", { name: /Preço e condições/ }));
  expect(await screen.findByText("Não foi possível salvar a visibilidade.")).toBeVisible();
  expect(screen.getByRole("switch", { name: /Preço e condições/ })).toBeChecked();
});

test("builder links to the visibility screen", async () => {
  mockFetch((path, init) => {
    if (path === "/api/projects/5" && !init?.method) return jsonResponse(200, project);
    if (path === "/api/projects/5/stages") return jsonResponse(200, []);
    if (path === "/api/projects/5/payments")
      return jsonResponse(200, { priceCents: 0, payments: [] });
    if (path === "/api/projects/5/attachments") return jsonResponse(200, []);
    return jsonResponse(500);
  });
  const router = renderAt("/projetos/5/montagem");
  await userEvent.click(await screen.findByRole("link", { name: /Visibilidade/ }));
  await waitFor(() => expect(router.state.location.pathname).toBe("/projetos/5/visibilidade"));
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { jsonResponse, mockFetch, renderAt } from "@/test-utils";

afterEach(() => vi.unstubAllGlobals());

const draftFile = {
  id: 7,
  name: "marca.pdf",
  contentType: "application/pdf",
  size: 2048,
  createdAt: "2026-10-01T10:00:00Z",
};

const published = {
  number: 1,
  title: "Primeira entrega",
  message: "",
  publishedAt: "2026-10-02T10:00:00Z",
  files: [{ ...draftFile, id: 8, name: "final.pdf", size: 4096 }],
};

const deliveryRoutes = (
  served: () => unknown,
  extra?: (path: string, init?: RequestInit) => Response | undefined,
) =>
  mockFetch(
    (path, init) =>
      extra?.(path, init) ??
      (path === "/api/projects/5/deliveries" && !init?.method
        ? jsonResponse(200, served())
        : jsonResponse(500)),
  );

const emptyDraft = () => ({ draft: null, published: [] });

test("the delivery screen lists the draft files and the published deliveries", async () => {
  deliveryRoutes(() => ({
    draft: { number: null, title: "", message: "", publishedAt: null, files: [draftFile] },
    published: [published],
  }));
  renderAt("/projetos/5/entrega");

  expect(await screen.findByRole("heading", { name: "Publicar entrega" })).toBeVisible();
  expect(screen.getByText("Em execução")).toBeVisible();
  expect(screen.getByText("marca.pdf")).toBeVisible();
  expect(screen.getByText("PDF · 2 KB")).toBeVisible();
  expect(screen.getByText("final.pdf")).toBeVisible();
  expect(screen.getByText("Entrega 1 · Primeira entrega")).toBeVisible();
});

test("uploading adds a draft file and a rejected type shows the problem", async () => {
  const spy = deliveryRoutes(emptyDraft, (path, init) =>
    path === "/api/projects/5/deliveries/draft/files" && init?.method === "POST"
      ? jsonResponse(201, draftFile)
      : undefined,
  );
  renderAt("/projetos/5/entrega");

  const input = await screen.findByLabelText(/Escolher arquivos/);
  await userEvent.upload(input, new File(["%PDF"], "marca.pdf", { type: "application/pdf" }));
  const call = spy.mock.calls.find(([path]) => path === "/api/projects/5/deliveries/draft/files")!;
  const body = call[1]?.body;
  expect(body instanceof FormData && body.get("file")).toBeInstanceOf(File);

  await userEvent.upload(input, new File(["x"], "notas.txt"), { applyAccept: false });
  expect(await screen.findByText("Envie PDF, JPG, PNG ou ZIP.")).toBeVisible();
  expect(spy.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});

test("removing a draft file calls the delete endpoint", async () => {
  const spy = deliveryRoutes(
    () => ({
      draft: { number: null, title: "", message: "", publishedAt: null, files: [draftFile] },
      published: [],
    }),
    (path, init) =>
      path === "/api/projects/5/deliveries/draft/files/7" && init?.method === "DELETE"
        ? jsonResponse(204)
        : undefined,
  );
  renderAt("/projetos/5/entrega");

  await userEvent.click(await screen.findByRole("button", { name: /Remover marca.pdf/ }));

  expect(
    spy.mock.calls.some(
      ([path, init]) =>
        path === "/api/projects/5/deliveries/draft/files/7" && init?.method === "DELETE",
    ),
  ).toBe(true);
});

test("publishing posts title and message and shows the success banner", async () => {
  let done = false;
  const spy = deliveryRoutes(
    () =>
      done
        ? { draft: null, published: [published] }
        : {
            draft: { number: null, title: "", message: "", publishedAt: null, files: [draftFile] },
            published: [],
          },
    (path, init) => {
      if (path === "/api/projects/5/deliveries/draft/publish" && init?.method === "POST") {
        done = true;
        return jsonResponse(204);
      }
    },
  );
  renderAt("/projetos/5/entrega");

  await userEvent.type(await screen.findByLabelText(/Título/), "Primeira entrega");
  await userEvent.type(screen.getByLabelText(/Mensagem/), "Segue o material.");
  await userEvent.click(screen.getByRole("button", { name: "Publicar entrega" }));

  expect(await screen.findByText("Entrega publicada.")).toBeVisible();
  const call = spy.mock.calls.find(
    ([path]) => path === "/api/projects/5/deliveries/draft/publish",
  )!;
  expect(JSON.parse(String(call[1]?.body))).toEqual({
    title: "Primeira entrega",
    message: "Segue o material.",
  });
  expect(screen.getByText("Entrega 1 · Primeira entrega")).toBeVisible();
});

test("publishing shows the server validation errors", async () => {
  deliveryRoutes(emptyDraft, (path, init) =>
    path === "/api/projects/5/deliveries/draft/publish" && init?.method === "POST"
      ? jsonResponse(400, { errors: { files: "Anexe ao menos um arquivo." } })
      : undefined,
  );
  renderAt("/projetos/5/entrega");

  await userEvent.type(await screen.findByLabelText(/Título/), "Entrega");
  await userEvent.click(screen.getByRole("button", { name: "Publicar entrega" }));

  expect(await screen.findByText("Anexe ao menos um arquivo.")).toBeVisible();
});

test("the delivery screen shows an error banner when loading fails", async () => {
  mockFetch(() => jsonResponse(500));
  renderAt("/projetos/5/entrega");

  expect(await screen.findByText("Não foi possível carregar a entrega.")).toBeVisible();
});

import { z } from "zod";

export type FieldErrors = Record<string, string>;

export type Outcome<T = undefined> =
  | { kind: "ok"; value: T }
  | { kind: "invalid"; status: number; errors: FieldErrors }
  | { kind: "unauthorized" }
  | { kind: "failed"; status: number };

export const areas = ["Fotografia", "Design", "Produção", "Outros serviços criativos"];

export const profileSchema = z.object({
  name: z.string(),
  businessName: z.string(),
  contactEmail: z.string(),
  phone: z.string(),
  area: z.string(),
  city: z.string(),
  bio: z.string(),
  hasAvatar: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;
export type ProfileInput = Omit<Profile, "hasAvatar">;

const errorsBody = z.object({ errors: z.record(z.string()) });

async function call<T>(
  path: string,
  init: RequestInit,
  parse: (res: Response) => Promise<T>,
  { guard401 = true } = {},
): Promise<Outcome<T>> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    return { kind: "failed", status: 0 };
  }
  if (res.ok) {
    try {
      return { kind: "ok", value: await parse(res) };
    } catch {
      return { kind: "failed", status: res.status };
    }
  }
  if (res.status === 401 && guard401) return { kind: "unauthorized" };
  const body = errorsBody.safeParse(await res.json().catch(() => null));
  if (body.success) return { kind: "invalid", status: res.status, errors: body.data.errors };
  return { kind: "failed", status: res.status };
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const none = async () => undefined;

export const signup = (input: {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}) => call("/api/signup", json("POST", input), none);

export const login = (input: { email: string; password: string }) =>
  call("/api/login", json("POST", input), none, { guard401: false });

export const getProfile = () =>
  call("/api/profile", {}, async (res) => profileSchema.parse(await res.json()));

export const saveProfile = (input: ProfileInput) => call("/api/profile", json("PUT", input), none);

export const uploadAvatar = (file: File) =>
  call("/api/profile/avatar", { method: "PUT", body: file }, none);

const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  company: z.string(),
  notes: z.string(),
  stage: z.enum(["recent", "proposal", "active"]),
  archived: z.boolean(),
});

export type Client = z.infer<typeof clientSchema>;

export const listClients = (archived = false) =>
  call(`/api/clients${archived ? "?archived=1" : ""}`, {}, async (res) =>
    z.array(clientSchema).parse(await res.json()),
  );

export type ClientInput = Pick<Client, "name" | "email" | "phone" | "company" | "notes">;

export const createClient = (input: ClientInput) => call("/api/clients", json("POST", input), none);

export const getClient = (id: string) =>
  call(`/api/clients/${encodeURIComponent(id)}`, {}, async (res) =>
    clientSchema.parse(await res.json()),
  );

export const updateClient = (id: string, input: ClientInput) =>
  call(`/api/clients/${encodeURIComponent(id)}`, json("PUT", input), none);

export const moveClient = (id: number, stage: Client["stage"]) =>
  call(`/api/clients/${id}/stage`, json("PUT", { stage }), none);

export const archiveClient = (id: number) =>
  call(`/api/clients/${id}/archive`, { method: "POST" }, none);

export const restoreClient = (id: number) =>
  call(`/api/clients/${id}/restore`, { method: "POST" }, none);

const projectSchema = z.object({
  id: z.number(),
  clientId: z.number(),
  clientName: z.string(),
  name: z.string(),
  area: z.string(),
  reference: z.string(),
  goal: z.string(),
  structure: z.enum(["blank", "essential", "suggested"]),
  status: z.enum(["draft", "final", "sent", "viewed", "changes_requested", "refused", "signed"]),
  archived: z.boolean(),
  scope: z.string(),
  outcome: z.string(),
  notes: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectStatusLabels: Record<Project["status"], string> = {
  draft: "Rascunho",
  final: "Finalizado",
  sent: "Enviado",
  viewed: "Visto",
  changes_requested: "Alteração solicitada",
  refused: "Recusado",
  signed: "Assinado",
};

export const listProjects = (archived = false) =>
  call(`/api/projects${archived ? "?archived=1" : ""}`, {}, async (res) =>
    z.array(projectSchema).parse(await res.json()),
  );

export type ProjectInput = Pick<
  Project,
  "clientId" | "name" | "area" | "reference" | "goal" | "structure"
>;

export const createProject = (input: ProjectInput) =>
  call("/api/projects", json("POST", input), async (res) => projectSchema.parse(await res.json()));

export const getProject = (id: string) =>
  call(`/api/projects/${encodeURIComponent(id)}`, {}, async (res) =>
    projectSchema.parse(await res.json()),
  );

export const updateProject = (id: string, input: Omit<ProjectInput, "structure">) =>
  call(`/api/projects/${encodeURIComponent(id)}`, json("PUT", input), none);

export const duplicateProject = (id: number, input: { name: string; clientId: number }) =>
  call(`/api/projects/${id}/duplicate`, json("POST", input), async (res) =>
    projectSchema.parse(await res.json()),
  );

export const archiveProject = (id: number) =>
  call(`/api/projects/${id}/archive`, { method: "POST" }, none);

export const timingKindLabels = {
  deadline: "Data limite",
  date: "Data específica",
  period: "Período",
  relative: "Duração relativa",
  milestone: "Marco sem data",
  none: "Sem prazo",
} as const;

export type TimingKind = keyof typeof timingKindLabels;

const stageSchema = z.object({
  id: z.number(),
  name: z.string(),
  timingKind: z.enum(["deadline", "date", "period", "relative", "milestone", "none"]),
  timing: z.string(),
  deliverable: z.string(),
  visible: z.boolean(),
  tasks: z.array(z.object({ id: z.number(), title: z.string() })),
});

export type Stage = z.infer<typeof stageSchema>;
export type StageInput = Omit<Stage, "id" | "tasks"> & { tasks: string[] };

export const listStages = (projectId: string) =>
  call(`/api/projects/${encodeURIComponent(projectId)}/stages`, {}, async (res) =>
    z.array(stageSchema).parse(await res.json()),
  );

export type BuilderInput = Pick<Project, "scope" | "outcome" | "notes">;

export const saveBuilder = (projectId: string, input: BuilderInput) =>
  call(`/api/projects/${encodeURIComponent(projectId)}/builder`, json("PUT", input), none);

const stagePath = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/stages`;

export const createStage = (projectId: string, input: StageInput) =>
  call(stagePath(projectId), json("POST", input), none);

export const updateStage = (projectId: string, stageId: number, input: StageInput) =>
  call(`${stagePath(projectId)}/${stageId}`, json("PUT", input), none);

export const deleteStage = (projectId: string, stageId: number) =>
  call(`${stagePath(projectId)}/${stageId}`, { method: "DELETE" }, none);

export const reorderStages = (projectId: string, ids: number[]) =>
  call(`${stagePath(projectId)}/order`, json("PUT", { ids }), none);

export const paymentKindLabels = {
  entrada: "Entrada",
  parcela: "Parcela intermediária",
  saldo: "Saldo final",
  unico: "Pagamento único",
} as const;

export const paymentTriggerLabels = {
  assinatura: "Na assinatura",
  data: "Data específica",
  etapa: "Início de etapa",
  antes_entrega: "Antes da entrega",
  apos_aprovacao: "Após aprovação",
} as const;

const paymentPlanSchema = z.object({
  priceCents: z.number(),
  payments: z.array(
    z.object({
      kind: z.enum(["entrada", "parcela", "saldo", "unico"]),
      percent: z.number(),
      trigger: z.enum(["assinatura", "data", "etapa", "antes_entrega", "apos_aprovacao"]),
      due: z.string(),
    }),
  ),
});

export type PaymentPlan = z.infer<typeof paymentPlanSchema>;
export type Payment = PaymentPlan["payments"][number];

const paymentsPath = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/payments`;

export const getPayments = (projectId: string) =>
  call(paymentsPath(projectId), {}, async (res) => paymentPlanSchema.parse(await res.json()));

export const savePayments = (projectId: string, plan: PaymentPlan) =>
  call(paymentsPath(projectId), json("PUT", plan), none);

const attachmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  contentType: z.string(),
  size: z.number(),
  createdAt: z.string(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

export const maxAttachmentBytes = 20 * 1024 * 1024;
export const attachmentExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".zip"];
export const attachmentTypeError = "Envie PDF, JPG, PNG ou ZIP.";
export const attachmentSizeError = "Cada arquivo pode ter até 20 MB.";

const attachmentsPath = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/attachments`;

export const attachmentUrl = (projectId: string, id: number) =>
  `${attachmentsPath(projectId)}/${id}`;

export const listAttachments = (projectId: string) =>
  call(attachmentsPath(projectId), {}, async (res) =>
    z.array(attachmentSchema).parse(await res.json()),
  );

export const uploadAttachment = (projectId: string, file: File) => {
  const body = new FormData();
  body.set("file", file);
  return call(attachmentsPath(projectId), { method: "POST", body }, none);
};

export const deleteAttachment = (projectId: string, id: number) =>
  call(attachmentUrl(projectId, id), { method: "DELETE" }, none);

const stageStatusSchema = z.enum(["pending", "in_progress", "done"]);

export type StageStatus = z.infer<typeof stageStatusSchema>;

export const parseStageStatus = (value: string) => stageStatusSchema.safeParse(value).data;

export const stageStatusLabels = {
  pending: "Pendente",
  in_progress: "Em execução",
  done: "Concluído",
} as const satisfies Record<StageStatus, string>;

const executionStageSchema = z.object({
  id: z.number(),
  name: z.string(),
  timing: z.string(),
  deliverable: z.string(),
  status: stageStatusSchema,
  tasks: z.array(z.object({ id: z.number(), title: z.string(), done: z.boolean() })),
  files: z.array(attachmentSchema),
});

export type ExecutionStage = z.infer<typeof executionStageSchema>;
export type ExecutionTask = ExecutionStage["tasks"][number];

const projectPath = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`;

export const getExecution = (projectId: string) =>
  call(`${projectPath(projectId)}/execution`, {}, async (res) =>
    z.array(executionStageSchema).parse(await res.json()),
  );

export const setStageStatus = (projectId: string, stageId: number, status: StageStatus) =>
  call(`${stagePath(projectId)}/${stageId}/status`, json("PUT", { status }), none);

export const addTask = (projectId: string, stageId: number, title: string) =>
  call(`${stagePath(projectId)}/${stageId}/tasks`, json("POST", { title }), none);

export const updateTask = (
  projectId: string,
  taskId: number,
  patch: Partial<Pick<ExecutionTask, "title" | "done">>,
) => call(`${projectPath(projectId)}/tasks/${taskId}`, json("PUT", patch), none);

export const deleteTask = (projectId: string, taskId: number) =>
  call(`${projectPath(projectId)}/tasks/${taskId}`, { method: "DELETE" }, none);

const stageFilesPath = (projectId: string, stageId: number) =>
  `${stagePath(projectId)}/${stageId}/files`;

export const stageFileUrl = (projectId: string, stageId: number, id: number) =>
  `${stageFilesPath(projectId, stageId)}/${id}`;

export const uploadStageFile = (projectId: string, stageId: number, file: File) => {
  const body = new FormData();
  body.set("file", file);
  return call(stageFilesPath(projectId, stageId), { method: "POST", body }, none);
};

export const deleteStageFile = (projectId: string, stageId: number, id: number) =>
  call(stageFileUrl(projectId, stageId, id), { method: "DELETE" }, none);

export const visibilityBlocks = [
  "scope",
  "stages",
  "deliverables",
  "price",
  "attachments",
] as const;

export type VisibilityBlock = (typeof visibilityBlocks)[number];

export const visibilityLabels = {
  scope: "Escopo",
  stages: "Etapas e prazos",
  deliverables: "Entregáveis",
  price: "Preço e condições",
  attachments: "Anexos",
} as const satisfies Record<VisibilityBlock, string>;

export type Visibility = Partial<Record<VisibilityBlock, boolean>>;

const visibilityPath = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/visibility`;

export const getVisibility = (projectId: string) =>
  call(visibilityPath(projectId), {}, async (res) =>
    z.record(z.enum(visibilityBlocks), z.boolean()).parse(await res.json()),
  );

export const saveVisibility = (projectId: string, patch: Visibility) =>
  call(visibilityPath(projectId), json("PUT", patch), none);

const partySchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  email: z.string().optional(),
});

export const clientViewSchema = z.object({
  project: z.string(),
  reference: z.string().optional(),
  professional: partySchema,
  client: partySchema,
  scope: z.object({ scope: z.string(), outcome: z.string() }).optional(),
  stages: z
    .array(
      z.object({ name: z.string(), timingKind: stageSchema.shape.timingKind, timing: z.string() }),
    )
    .optional(),
  deliverables: z.array(z.object({ stage: z.string(), text: z.string() })).optional(),
  price: paymentPlanSchema.optional(),
  attachments: z
    .array(z.object({ name: z.string(), contentType: z.string(), size: z.number() }))
    .optional(),
});

export type ClientView = z.infer<typeof clientViewSchema>;

export const getClientView = (projectId: string) =>
  call(`/api/projects/${encodeURIComponent(projectId)}/client-view`, {}, async (res) =>
    clientViewSchema.parse(await res.json()),
  );

const contractSchema = z.object({
  number: z.number(),
  hash: z.string(),
  createdAt: z.string(),
  content: clientViewSchema,
});

export type Contract = z.infer<typeof contractSchema>;

const contractPath = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/contract`;

export const finalizeContract = (projectId: string) =>
  call(contractPath(projectId), { method: "POST" }, async (res) =>
    contractSchema.parse(await res.json()),
  );

export const getContract = (projectId: string, number: number) =>
  call(`${contractPath(projectId)}/${number}`, {}, async (res) =>
    contractSchema.parse(await res.json()),
  );

const versionsSchema = z.object({
  versions: z.array(
    z.object({ number: z.number(), hash: z.string(), note: z.string(), createdAt: z.string() }),
  ),
  signature: z.object({ name: z.string(), email: z.string(), version: z.number() }).nullable(),
});

export const listVersions = (projectId: string) =>
  call(contractPath(projectId), {}, async (res) => versionsSchema.parse(await res.json()));

export const reviseContract = (projectId: string, note: string) =>
  call(`${contractPath(projectId)}/revision`, json("POST", { note }), none);

const shareSchema = z.object({
  token: z.string(),
  url: z.string(),
  viewedAt: z.string().nullable(),
  request: z
    .object({
      kind: z.enum(["change", "refuse"]),
      message: z.string(),
      version: z.number(),
      createdAt: z.string(),
    })
    .nullable(),
});

export type Share = z.infer<typeof shareSchema>;

const sharePath = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/share`;

export const getShare = (projectId: string) =>
  call(sharePath(projectId), {}, async (res) => shareSchema.parse(await res.json()));

export const createShare = (projectId: string) =>
  call(sharePath(projectId), { method: "POST" }, async (res) =>
    shareSchema.parse(await res.json()),
  );

export const regenerateShare = (projectId: string) =>
  call(`${sharePath(projectId)}/regenerate`, { method: "POST" }, async (res) =>
    shareSchema.parse(await res.json()),
  );

const receiptSchema = z.object({
  name: z.string(),
  email: z.string(),
  version: z.number(),
  hash: z.string(),
  signedAt: z.string(),
});

export type Receipt = z.infer<typeof receiptSchema>;

const portalSchema = z.object({
  version: z.number(),
  status: projectSchema.shape.status,
  content: clientViewSchema,
  signature: receiptSchema.nullable(),
  progress: z.array(z.object({ name: z.string(), status: stageStatusSchema })).optional(),
});

export type Portal = z.infer<typeof portalSchema>;

const portalPath = (token: string) => `/api/portal/${encodeURIComponent(token)}`;

export const getPortal = (token: string) =>
  call(portalPath(token), {}, async (res) => portalSchema.parse(await res.json()));

export const requestChange = (token: string, message: string) =>
  call(`${portalPath(token)}/change`, json("POST", { message }), none);

export const refuseProject = (token: string, reason: string) =>
  call(`${portalPath(token)}/refuse`, json("POST", { reason }), none);

export const signContract = (
  token: string,
  input: { version: number; name: string; email: string; consent: boolean },
) =>
  call(`${portalPath(token)}/sign`, json("POST", input), async (res) =>
    receiptSchema.parse(await res.json()),
  );

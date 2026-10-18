import { z } from "zod";

export type FieldErrors = Record<string, string>;

export type Outcome<T = undefined> =
  | { kind: "ok"; value: T }
  | { kind: "invalid"; status: number; errors: FieldErrors }
  | { kind: "unauthorized" }
  | { kind: "failed"; status: number };

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

export const clientSchema = z.object({
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
  call(`/api/clients/${id}`, {}, async (res) => clientSchema.parse(await res.json()));

export const updateClient = (id: string, input: ClientInput) =>
  call(`/api/clients/${id}`, json("PUT", input), none);

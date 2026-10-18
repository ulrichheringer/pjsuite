import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  areas,
  getProfile,
  saveProfile,
  uploadAvatar,
  type FieldErrors,
  type ProfileInput,
} from "@/api";
import { Avatar, Banner, Button, Choice, Field, Loading, UploadBox } from "@/ui";

export const Route = createFileRoute("/perfil")({ component: ProfilePage });

const avatarErrors: Record<number, string> = {
  413: "A imagem deve ter até 2 MB.",
  415: "Use uma imagem PNG, JPG ou WebP.",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileInput>();
  const [avatarVersion, setAvatarVersion] = useState<number | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [avatarError, setAvatarError] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getProfile().then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setFailed(true);
      const { hasAvatar, ...profile } = outcome.value;
      setForm({ ...profile, area: profile.area || areas[0] });
      setAvatarVersion(hasAvatar ? 0 : null);
    });
  }, [navigate]);

  if (!form) {
    return (
      <div className="product">
        <main className="pro-main">
          {failed ? (
            <Banner title="Não foi possível carregar o perfil." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  const set = (key: keyof ProfileInput) => (value: string) => {
    setSaved(false);
    setForm({ ...form, [key]: value });
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    const outcome = await saveProfile(form);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setFailed(outcome.kind === "failed");
    setSaved(outcome.kind === "ok");
  }

  async function upload([file]: File[]) {
    if (!file) return;
    const outcome = await uploadAvatar(file);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "ok") {
      setAvatarError(undefined);
      return setAvatarVersion(Date.now());
    }
    setAvatarError(
      (outcome.kind === "invalid" || outcome.kind === "failed") && avatarErrors[outcome.status]
        ? avatarErrors[outcome.status]
        : "Não foi possível enviar a foto.",
    );
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Um perfil com a sua assinatura.</h1>
            <p>Esses dados apresentam você nos projetos e contratos.</p>
          </div>
        </header>
        {failed && (
          <Banner title="Não foi possível concluir." tone="danger">
            Seus dados foram mantidos. Confira os campos e tente novamente.
          </Banner>
        )}
        {saved && <Banner title="Perfil salvo." tone="success" />}
        <form className="form-surface" onSubmit={submit} noValidate>
          <div className="profile-banner">
            <Avatar
              size="large"
              name={form.name}
              src={avatarVersion === null ? undefined : `/api/profile/avatar?v=${avatarVersion}`}
            />
            <div>
              <h3>{form.name}</h3>
              <p>Seu nome acompanha cada projeto.</p>
            </div>
          </div>
          {avatarError && (
            <Banner title="Foto não enviada." tone="danger">
              {avatarError}
            </Banner>
          )}
          <UploadBox
            title="Enviar foto"
            hint="PNG, JPG ou WebP · até 2 MB"
            accept="image/png,image/jpeg,image/webp"
            multiple={false}
            onFiles={upload}
          />
          <div className="two-col">
            <Field
              label="Nome profissional"
              value={form.name}
              onChange={set("name")}
              error={errors.name}
              required
            />
            <Field
              label="Nome do negócio"
              value={form.businessName}
              onChange={set("businessName")}
            />
            <Field
              label="E-mail de contato"
              type="email"
              value={form.contactEmail}
              onChange={set("contactEmail")}
              error={errors.contactEmail}
              required
            />
            <Field label="Telefone" value={form.phone} onChange={set("phone")} />
            <Choice
              label="Área de atuação"
              options={areas}
              value={form.area}
              onChange={set("area")}
            />
            <Field label="Cidade" value={form.city} onChange={set("city")} />
          </div>
          <Field label="Apresentação curta" value={form.bio} onChange={set("bio")} area />
          <div className="form-actions">
            {saved ? (
              <Button type="button" onClick={() => navigate({ to: "/" })}>
                Continuar
                <ArrowRight />
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar perfil e continuar"}
                <ArrowRight />
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { signup, type FieldErrors } from "@/api";
import { AuthLayout } from "@/auth-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Banner, Button, Field } from "@/ui";

export const Route = createFileRoute("/cadastro")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    const outcome = await signup({ name, email, password, acceptTerms });
    setPending(false);
    setFailed(outcome.kind === "failed");
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    if (outcome.kind === "ok") await navigate({ to: "/perfil" });
  }

  return (
    <AuthLayout
      title="Comece pelo seu nome."
      subtitle="Crie sua conta e dê forma ao próximo projeto."
      switchText="Já tem uma conta?"
      switchLabel="Entrar"
      switchTo="/entrar"
    >
      {failed && (
        <Banner title="Não foi possível criar a conta." tone="danger">
          Tente novamente em instantes.
        </Banner>
      )}
      <form onSubmit={submit} noValidate>
        <Field
          label="Seu nome"
          placeholder="Como você quer ser chamado?"
          value={name}
          onChange={setName}
          error={errors.name}
          required
        />
        <Field
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
          required
        />
        <Field
          label="Senha"
          type="password"
          placeholder="Pelo menos 8 caracteres"
          value={password}
          onChange={setPassword}
          error={errors.password}
          required
        />
        <label className="check-label">
          <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} />
          Li e aceito os termos
        </label>
        {errors.acceptTerms && <p className="field-error">{errors.acceptTerms}</p>}
        <Button type="submit" className="full" disabled={pending}>
          {pending ? "Criando…" : "Criar minha conta"}
          <ArrowRight size={18} />
        </Button>
      </form>
    </AuthLayout>
  );
}

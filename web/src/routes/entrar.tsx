import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { login } from "@/api";
import { AuthLayout } from "@/auth-layout";
import { Banner, Button, Field } from "@/ui";

export const Route = createFileRoute("/entrar")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    const outcome = await login({ email, password });
    setPending(false);
    if (outcome.kind === "ok") return navigate({ to: "/" });
    setError(
      outcome.kind === "invalid"
        ? (outcome.errors.form ?? "Confira seu e-mail e senha.")
        : "Tente novamente em instantes.",
    );
  }

  return (
    <AuthLayout
      title="Bom ter você aqui."
      subtitle="Entre para dar continuidade aos seus projetos."
      switchText="Ainda não tem uma conta?"
      switchLabel="Criar conta"
      switchTo="/cadastro"
    >
      {error && (
        <Banner title="Não foi possível entrar." tone="danger">
          {error}
        </Banner>
      )}
      <form onSubmit={submit} noValidate>
        <Field
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="Senha"
          type="password"
          placeholder="Pelo menos 8 caracteres"
          value={password}
          onChange={setPassword}
          required
        />
        <Button type="submit" className="full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
          <ArrowRight size={18} />
        </Button>
      </form>
    </AuthLayout>
  );
}

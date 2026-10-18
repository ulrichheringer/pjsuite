import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createClient, type FieldErrors } from "@/api";
import { ClientFields, emptyClient } from "@/client-fields";
import { Banner, Button } from "@/ui";

export const Route = createFileRoute("/clientes/novo")({ component: NewClientPage });

function NewClientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyClient);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    const outcome = await createClient(form);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "ok") return navigate({ to: "/clientes" });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setFailed(outcome.kind === "failed");
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Novo cliente</h1>
            <p>Cadastre os dados para identificar o cliente nos projetos.</p>
          </div>
        </header>
        {failed && (
          <Banner title="Não foi possível concluir." tone="danger">
            Seus dados foram mantidos. Confira os campos e tente novamente.
          </Banner>
        )}
        <form className="form-surface" onSubmit={submit} noValidate>
          <ClientFields value={form} errors={errors} onChange={setForm} />
          <div className="form-actions">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Criar cliente"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

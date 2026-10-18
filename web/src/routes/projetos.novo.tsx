import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { createProject, listClients, type Client, type FieldErrors } from "@/api";
import { ProjectFields, emptyProject } from "@/project-fields";
import { Banner, Button } from "@/ui";

export const Route = createFileRoute("/projetos/novo")({ component: NewProjectPage });

const nextSteps = [
  ["01", "Detalhes", "agora"],
  ["02", "Estrutura", "a seguir"],
  ["03", "Valores", "na montagem"],
  ["04", "Visibilidade", "antes de enviar"],
];

function NewProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProject);
  const [clients, setClients] = useState<Client[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listClients().then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setFailed(true);
      setClients(outcome.value);
      setForm((current) => ({ ...current, clientId: outcome.value[0]?.id ?? 0 }));
    });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    const outcome = await createProject(form);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "ok") return navigate({ to: "/projetos", search: { criado: true } });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setFailed(outcome.kind === "failed");
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Comece pelo essencial.</h1>
            <p>Dê contexto agora. Etapas, prazos e pagamentos ganham forma na montagem.</p>
          </div>
        </header>
        {failed && (
          <Banner title="Não foi possível concluir." tone="danger">
            Seus dados foram mantidos. Confira os campos e tente novamente.
          </Banner>
        )}
        <form className="form-surface project-start-form" onSubmit={submit} noValidate>
          <ProjectFields
            value={form}
            errors={errors}
            clients={clients}
            chooseStructure
            onChange={setForm}
          />
          <div className="setup-flow" aria-label="Próximos passos da configuração">
            {nextSteps.map(([number, label, note]) => (
              <div key={number}>
                <span>{number}</span>
                <strong>{label}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <Button variant="outline" asChild>
              <Link to="/projetos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Criar e montar projeto"}
              <ArrowRight />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

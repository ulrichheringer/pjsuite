import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  getProject,
  listClients,
  updateProject,
  type Client,
  type FieldErrors,
  type Project,
  type ProjectInput,
} from "@/api";
import { ProjectFields } from "@/project-fields";
import { Banner, Button, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id")({ component: EditProjectPage });

function EditProjectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>();
  const [form, setForm] = useState<ProjectInput>();
  const [clients, setClients] = useState<Pick<Client, "id" | "name">[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([getProject(id), listClients()]).then(([current, active]) => {
      if (current.kind === "unauthorized" || active.kind === "unauthorized") {
        return navigate({ to: "/entrar" });
      }
      if (current.kind !== "ok" || active.kind !== "ok") return setFailed(true);
      const { clientId, clientName, name, area, reference, goal, structure } = current.value;
      setProject(current.value);
      setForm({ clientId, name, area, reference, goal, structure });
      setClients(
        active.value.some((c) => c.id === clientId)
          ? active.value
          : [{ id: clientId, name: clientName }, ...active.value],
      );
    });
  }, [id, navigate]);

  if (!project || !form) {
    return (
      <div className="product">
        <main className="pro-main">
          {failed ? (
            <Banner title="Não foi possível carregar o projeto." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    const { clientId, name, area, reference, goal } = form;
    const outcome = await updateProject(id, { clientId, name, area, reference, goal });
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "ok") return navigate({ to: "/projetos/$id/montagem", params: { id } });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setFailed(outcome.kind === "failed");
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Detalhes do projeto</h1>
            <p>Dê contexto agora. Etapas, prazos e pagamentos ganham forma na montagem.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/projetos">
              <ArrowLeft />
              Voltar para projetos
            </Link>
          </Button>
        </header>
        {project.status === "signed" && (
          <Button asChild>
            <Link to="/projetos/$id/execucao" params={{ id }}>
              Acompanhar execução
            </Link>
          </Button>
        )}
        {failed && (
          <Banner title="Não foi possível concluir." tone="danger">
            Seus dados foram mantidos. Confira os campos e tente novamente.
          </Banner>
        )}
        {project.archived && (
          <Banner title="Projeto arquivado." tone="info">
            Projetos arquivados ficam somente para consulta.
          </Banner>
        )}
        <form className="form-surface project-start-form" onSubmit={submit} noValidate>
          <ProjectFields
            value={form}
            errors={errors}
            clients={clients}
            disabled={project.archived}
            onChange={setForm}
          />
          <Banner title="Alterações comerciais geram uma nova versão.">
            Contratos já assinados permanecem preservados.
          </Banner>
          {!project.archived && (
            <div className="form-actions">
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  getProject,
  getShare,
  listVersions,
  projectStatusLabels,
  reviseContract,
  type FieldErrors,
  type Project,
  type Share,
} from "@/api";
import { Badge, Banner, Button, Field, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/revisao")({ component: RevisionPage });

type Loaded = { project: Project; request: Share["request"]; nextVersion: number };

function RevisionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([getProject(id), getShare(id), listVersions(id)]).then(
      ([project, share, versions]) => {
        if ([project, share, versions].some((outcome) => outcome.kind === "unauthorized")) {
          return navigate({ to: "/entrar" });
        }
        if (project.kind !== "ok" || share.kind !== "ok" || versions.kind !== "ok") {
          return setLoadFailed(true);
        }
        setLoaded({
          project: project.value,
          request: share.value.request,
          nextVersion: (versions.value.versions[0]?.number ?? 0) + 1,
        });
      },
    );
  }, [id, navigate]);

  if (!loaded) {
    return (
      <div className="product">
        <main className="pro-main">
          {loadFailed ? (
            <Banner title="Não foi possível carregar a revisão." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setProblem(false);
    const outcome = await reviseContract(id, note);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "ok") return navigate({ to: "/projetos/$id/compartilhar", params: { id } });
    if (outcome.kind === "invalid" && outcome.status === 400) return setErrors(outcome.errors);
    setErrors({});
    setProblem(true);
  }

  const { project, request, nextVersion } = loaded;

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Um ajuste antes do sim.</h1>
            <p>{project.name}</p>
          </div>
          <Badge>{projectStatusLabels[project.status]}</Badge>
        </header>
        {problem && (
          <Banner title="Não foi possível publicar a nova versão." tone="danger">
            Nada foi alterado. Tente novamente.
          </Banner>
        )}
        {request && (
          <Banner title="O cliente pediu uma alteração." tone="warning">
            {request.message}
          </Banner>
        )}
        <form className="surface" onSubmit={publish}>
          <Button variant="outline" asChild>
            <Link to="/projetos/$id/montagem" params={{ id }}>
              Editar projeto
            </Link>
          </Button>
          <Field
            label="O que mudou nesta versão?"
            area
            required
            value={note}
            error={errors.note}
            onChange={setNote}
          />
          <Banner title={`A próxima publicação será a versão ${nextVersion}.`}>
            O pedido e a versão anterior continuam registrados.
          </Banner>
          <Button type="submit" disabled={pending}>
            {pending ? "Publicando…" : "Finalizar e reenviar"}
          </Button>
        </form>
      </main>
    </div>
  );
}

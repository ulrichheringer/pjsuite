import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, RefreshCw } from "lucide-react";
import {
  createShare,
  getProject,
  getShare,
  projectStatusLabels,
  regenerateShare,
  type Outcome,
  type Project,
  type Share,
} from "@/api";
import { Stepper } from "@/stepper";
import { Badge, Banner, Button, Field, Loading, Timeline } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/compartilhar")({ component: SharePage });

const requestTitles = { change: "Pedido de alteração", refuse: "Motivo da recusa" };

function SharePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>();
  const [share, setShare] = useState<Share | null>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [problem, setProblem] = useState(false);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([getProject(id), getShare(id)]).then(([current, link]) => {
      if (current.kind === "unauthorized" || link.kind === "unauthorized") {
        return navigate({ to: "/entrar" });
      }
      if (
        current.kind !== "ok" ||
        (link.kind !== "ok" && !(link.kind === "failed" && link.status === 404))
      ) {
        return setLoadFailed(true);
      }
      setProject(current.value);
      setShare(link.kind === "ok" ? link.value : null);
    });
  }, [id, navigate]);

  if (!project || share === undefined) {
    return (
      <div className="product">
        <main className="pro-main">
          {loadFailed ? (
            <Banner title="Não foi possível carregar o link." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function generate(action: (projectId: string) => Promise<Outcome<Share>>) {
    setPending(true);
    setProblem(false);
    const outcome = await action(id);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setProblem(true);
    setCopied("idle");
    setShare(outcome.value);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  const url = share ? `${window.location.origin}${share.url}` : "";

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Compartilhar com o cliente</h1>
            <p>{project.name}</p>
          </div>
          <Badge>{projectStatusLabels[project.status]}</Badge>
        </header>
        <Stepper id={id} current="compartilhar" />
        {problem && (
          <Banner title="Não foi possível gerar o link." tone="danger">
            Nada foi alterado. Tente novamente.
          </Banner>
        )}
        {project.status === "draft" ? (
          <Banner title="Finalize o contrato antes de compartilhar." tone="warning">
            <Link to="/projetos/$id/contrato" params={{ id }}>
              Ir para o contrato
            </Link>
          </Banner>
        ) : share ? (
          <section className="surface">
            <Field key={url} label="Link de revisão" value={url} />
            <Button onClick={() => copy(url)}>
              <Copy />
              Copiar link
            </Button>
            {project.status !== "signed" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => generate(regenerateShare)}
              >
                <RefreshCw />
                Gerar novo link
              </Button>
            )}
            {project.status === "signed" && <Banner title="Contrato assinado." tone="success" />}
            {copied === "done" && <Banner title="Link copiado." tone="success" />}
            {copied === "failed" && (
              <Banner title="Não foi possível copiar o link." tone="danger">
                Copie o link do campo acima.
              </Banner>
            )}
            <p className="small">
              Envie o link pelo seu canal. O link antigo deixa de funcionar ao gerar um novo.
            </p>
            {share.viewedAt && (
              <Timeline
                events={[
                  `Visto pelo cliente · ${new Date(share.viewedAt).toLocaleString("pt-BR")}`,
                ]}
              />
            )}
            {share.request && (
              <Banner title={requestTitles[share.request.kind]} tone="warning">
                {share.request.message}
              </Banner>
            )}
            {project.status === "changes_requested" && (
              <Button asChild>
                <Link to="/projetos/$id/revisao" params={{ id }}>
                  Ajustar e reenviar
                </Link>
              </Button>
            )}
          </section>
        ) : (
          <Button disabled={pending} onClick={() => generate(createShare)}>
            Gerar link
          </Button>
        )}
      </main>
    </div>
  );
}

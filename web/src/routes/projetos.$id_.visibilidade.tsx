import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye } from "lucide-react";
import {
  getClientView,
  getProject,
  getVisibility,
  saveVisibility,
  visibilityBlocks,
  visibilityLabels,
  type ClientView,
  type Project,
  type Visibility,
  type VisibilityBlock,
} from "@/api";
import { ClientPreview } from "@/client-preview";
import { Switch } from "@/components/ui/switch";
import { Badge, Banner, Button, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/visibilidade")({ component: VisibilityPage });

const steps = ["01 Montagem", "02 Visibilidade", "03 Contrato", "04 Compartilhar"];

function VisibilityPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>();
  const [visible, setVisible] = useState<Visibility>({});
  const [view, setView] = useState<ClientView>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [saving, setSaving] = useState<VisibilityBlock[]>([]);

  useEffect(() => {
    Promise.all([getProject(id), getVisibility(id), getClientView(id)]).then(
      ([current, blocks, preview]) => {
        if ([current, blocks, preview].some((outcome) => outcome.kind === "unauthorized")) {
          return navigate({ to: "/entrar" });
        }
        if (current.kind !== "ok" || blocks.kind !== "ok" || preview.kind !== "ok") {
          return setLoadFailed(true);
        }
        setProject(current.value);
        setVisible(blocks.value);
        setView(preview.value);
      },
    );
  }, [id, navigate]);

  if (!project || !view) {
    return (
      <div className="product">
        <main className="pro-main">
          {loadFailed ? (
            <Banner title="Não foi possível carregar a visibilidade." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function toggle(block: VisibilityBlock, on: boolean) {
    setSaving((current) => [...current, block]);
    const saved = await saveVisibility(id, { [block]: on });
    setSaving((current) => current.filter((pending) => pending !== block));
    if (saved.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (saved.kind !== "ok") return setProblem("Não foi possível salvar a visibilidade.");
    setProblem(undefined);
    setVisible((current) => ({ ...current, [block]: on }));
    const preview = await getClientView(id);
    if (preview.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (preview.kind !== "ok") return setProblem("Não foi possível atualizar a prévia.");
    setView(preview.value);
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>O cliente vê o que faz sentido.</h1>
            <p>Ligue ou desligue os blocos e confira a prévia ao lado.</p>
          </div>
          <Badge>{project.status === "final" ? "Finalizado" : "Rascunho"}</Badge>
        </header>
        <div className="stepper">
          {steps.map((step, i) =>
            i === 0 ? (
              <Link key={step} to="/projetos/$id/montagem" params={{ id }}>
                {step}
              </Link>
            ) : i === 1 ? (
              <strong key={step}>{step}</strong>
            ) : i === 2 ? (
              <Link key={step} to="/projetos/$id/contrato" params={{ id }}>
                {step}
              </Link>
            ) : (
              <span key={step}>{step}</span>
            ),
          )}
        </div>
        {problem && <Banner title={problem} tone="danger" />}
        <div className="visibility-layout">
          <section className="surface visibility-controls">
            <h2>Visibilidade dos blocos</h2>
            <p>Identificação e contrato são sempre visíveis.</p>
            {visibilityBlocks.map((block) => (
              <div className="switch-row" key={block}>
                <label htmlFor={`visible-${block}`}>
                  <strong>{visibilityLabels[block]}</strong>
                  <small>{visible[block] ? "Visível para o cliente" : "Só você vê"}</small>
                </label>
                <Switch
                  id={`visible-${block}`}
                  checked={visible[block] ?? true}
                  disabled={project.archived || saving.includes(block)}
                  onCheckedChange={(on) => toggle(block, on)}
                />
              </div>
            ))}
            <Button className="full" asChild>
              <Link to="/projetos/$id/contrato" params={{ id }}>
                Conferir contrato
                <ArrowRight />
              </Link>
            </Button>
          </section>
          <div className="client-preview">
            <div className="preview-label">
              <Eye size={16} /> ASSIM O CLIENTE VÊ
            </div>
            <div className="client-preview-body">
              <ClientPreview view={view} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

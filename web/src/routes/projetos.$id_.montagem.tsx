import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EyeOff } from "lucide-react";
import {
  getProject,
  listStages,
  saveBuilder,
  timingKindLabels,
  type BuilderInput,
  type FieldErrors,
  type Project,
  type Stage,
} from "@/api";
import { Badge, Banner, Button, Field, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/montagem")({ component: BuilderPage });

const steps = ["01 Montagem", "02 Visibilidade", "03 Contrato", "04 Compartilhar"];

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="surface">
      <div className="row-between section-heading">
        <h2>{label}</h2>
      </div>
      {children}
    </section>
  );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function StageRow({ stage, number }: { stage: Stage; number: number }) {
  const timing =
    stage.timingKind === "none"
      ? timingKindLabels.none
      : `${timingKindLabels[stage.timingKind]} · ${stage.timing || "prazo a definir"}`;
  return (
    <div className="phase-item">
      <span className="phase-number">{String(number).padStart(2, "0")}</span>
      <div className="phase-content">
        <div className="phase-title-line">
          <h3>{stage.name}</h3>
          {!stage.visible && (
            <span className="private-label">
              <EyeOff size={12} /> interno
            </span>
          )}
        </div>
        <small>{timing}</small>
        <p>
          {plural(stage.tasks.length, "tarefa", "tarefas")}
          {stage.deliverable ? ` · ${stage.deliverable}` : " · sem entregável"}
        </p>
      </div>
    </div>
  );
}

function BuilderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>();
  const [stages, setStages] = useState<Stage[]>([]);
  const [text, setText] = useState<BuilderInput>({ scope: "", outcome: "", notes: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([getProject(id), listStages(id)]).then(([current, list]) => {
      if (current.kind === "unauthorized" || list.kind === "unauthorized") {
        return navigate({ to: "/entrar" });
      }
      if (current.kind !== "ok" || list.kind !== "ok") return setLoadFailed(true);
      const { scope, outcome, notes } = current.value;
      setProject(current.value);
      setStages(list.value);
      setText({ scope, outcome, notes });
    });
  }, [id, navigate]);

  if (!project) {
    return (
      <div className="product">
        <main className="pro-main">
          {loadFailed ? (
            <Banner title="Não foi possível carregar a montagem." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function save() {
    setPending(true);
    const outcome = await saveBuilder(id, text);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setSaveFailed(outcome.kind !== "ok");
    setSaved(outcome.kind === "ok");
  }

  const change = (patch: Partial<BuilderInput>) => {
    setSaved(false);
    setText({ ...text, ...patch });
  };

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Montagem do projeto</h1>
            <p>Monte uma estrutura que acompanha o seu jeito de trabalhar.</p>
          </div>
          <Badge>Rascunho</Badge>
        </header>
        <div className="stepper">
          {steps.map((step, i) =>
            i === 0 ? <strong key={step}>{step}</strong> : <span key={step}>{step}</span>,
          )}
        </div>
        {saveFailed && (
          <Banner title="Não foi possível salvar a montagem." tone="danger">
            Seus dados foram mantidos. Confira os campos e tente novamente.
          </Banner>
        )}
        {saved && <Banner title="Montagem salva." tone="success" />}
        <div className="editor-layout">
          <div className="stack">
            <Section label="01 / Escopo">
              <Field
                label="O que será feito e qual resultado deve ser alcançado?"
                area
                value={text.scope}
                error={errors.scope}
                disabled={project.archived}
                onChange={(scope) => change({ scope })}
              />
            </Section>
            <Section label="02 / Etapas, tarefas e entregáveis">
              <p className="section-intro">
                Crie quantas etapas precisar. Cada uma pode ter data, período, duração relativa ou
                apenas um marco de conclusão.
              </p>
              <div className="phase-list">
                {stages.map((stage, i) => (
                  <StageRow key={stage.id} stage={stage} number={i + 1} />
                ))}
              </div>
            </Section>
            <Section label="03 / Resultado final">
              <Field
                label="O que encerra o projeto?"
                area
                value={text.outcome}
                error={errors.outcome}
                disabled={project.archived}
                onChange={(outcome) => change({ outcome })}
              />
            </Section>
          </div>
          <aside className="editor-side">
            <Section label="Estrutura do projeto">
              <div className="builder-summary">
                <span>
                  <strong>{stages.length}</strong> etapas
                </span>
                <span>
                  <strong>{stages.reduce((total, stage) => total + stage.tasks.length, 0)}</strong>{" "}
                  tarefas
                </span>
              </div>
              <p className="small">
                A estrutura não é fixa. Você pode voltar e ajustar tudo antes de finalizar o
                contrato.
              </p>
            </Section>
            <Section label="Notas internas">
              <Field
                label="Só você vê"
                area
                value={text.notes}
                error={errors.notes}
                disabled={project.archived}
                onChange={(notes) => change({ notes })}
              />
              <p className="small">
                <EyeOff size={14} /> Oculto do cliente por padrão.
              </p>
            </Section>
            {!project.archived && (
              <Button variant="ghost" className="full" disabled={pending} onClick={save}>
                {pending ? "Salvando…" : "Salvar rascunho"}
              </Button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

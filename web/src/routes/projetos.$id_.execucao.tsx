import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  addTask,
  deleteStageFile,
  deleteTask,
  getExecution,
  setStageStatus,
  stageFileUrl,
  stageStatusLabels,
  parseStageStatus,
  updateTask,
  uploadStageFile,
  type ExecutionStage,
  type ExecutionTask,
  type Outcome,
} from "@/api";
import { fileMeta, precheck } from "@/attachments";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Banner, Blank, Button, FileRow, Loading, UploadBox } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/execucao")({ component: ExecutionPage });

type Run = (request: Promise<Outcome>, failure: string) => Promise<boolean>;

function ExecutionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [stages, setStages] = useState<ExecutionStage[]>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [problem, setProblem] = useState<string>();

  const refresh = useCallback(async () => {
    const outcome = await getExecution(id);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setLoadFailed(true);
    setStages(outcome.value);
  }, [id, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run: Run = async (request, failure) => {
    setProblem(undefined);
    const outcome = await request;
    if (outcome.kind === "unauthorized") {
      await navigate({ to: "/entrar" });
      return false;
    }
    const ok = outcome.kind === "ok";
    if (!ok) setProblem(failure);
    await refresh();
    return ok;
  };

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO</span>
            <h1>Execução</h1>
            <p>Marque tarefas, avance cada etapa e guarde os arquivos de trabalho.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/projetos/$id" params={{ id }}>
              <ArrowLeft />
              Voltar ao projeto
            </Link>
          </Button>
        </header>
        <Button asChild>
          <Link to="/projetos/$id/entrega" params={{ id }}>
            Publicar entrega
          </Link>
        </Button>
        {loadFailed && (
          <Banner title="Não foi possível carregar a execução." tone="danger">
            Tente novamente em instantes.
          </Banner>
        )}
        {problem && <Banner title={problem} tone="danger" />}
        {!stages && !loadFailed && <Loading />}
        {stages?.length === 0 && (
          <Blank
            title="Nenhuma etapa para acompanhar."
            description="As etapas do contrato assinado aparecem aqui."
          />
        )}
        {stages?.map((stage) => (
          <StageCard key={stage.id} projectId={id} stage={stage} run={run} onProblem={setProblem} />
        ))}
      </main>
    </div>
  );
}

function StageCard({
  projectId,
  stage,
  run,
  onProblem,
}: {
  projectId: string;
  stage: ExecutionStage;
  run: Run;
  onProblem: (problem: string) => void;
}) {
  const [title, setTitle] = useState("");

  async function submitTask(event: FormEvent) {
    event.preventDefault();
    if (await run(addTask(projectId, stage.id, title), "Não foi possível adicionar a tarefa."))
      setTitle("");
  }

  async function upload(chosen: File[]) {
    const rejections = new Set<string>();
    for (const file of chosen) {
      const rejection = precheck(file);
      if (rejection) {
        rejections.add(rejection);
        continue;
      }
      await run(
        uploadStageFile(projectId, stage.id, file),
        `Não foi possível enviar ${file.name}.`,
      );
    }
    if (rejections.size > 0) onProblem([...rejections].join(" "));
  }

  return (
    <section className="surface">
      <div className="row-between section-heading">
        <h2>{stage.name}</h2>
        <NativeSelect
          aria-label={`Status de ${stage.name}`}
          value={stage.status}
          onChange={(event) => {
            const status = parseStageStatus(event.target.value);
            if (status)
              run(
                setStageStatus(projectId, stage.id, status),
                "Não foi possível salvar a alteração.",
              );
          }}
        >
          {Object.entries(stageStatusLabels).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {(stage.timing || stage.deliverable) && (
        <p>{[stage.timing, stage.deliverable].filter(Boolean).join(" · ")}</p>
      )}
      {stage.tasks.map((task) => (
        <TaskRow key={task.id} projectId={projectId} task={task} run={run} />
      ))}
      <form className="check-label" onSubmit={submitTask}>
        <Input
          aria-label={`Nova tarefa em ${stage.name}`}
          placeholder="Nova tarefa"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Adicionar tarefa
        </Button>
      </form>
      <UploadBox onFiles={upload} />
      {stage.files.map((file) => (
        <FileRow
          key={file.id}
          name={file.name}
          meta={fileMeta(file)}
          href={stageFileUrl(projectId, stage.id, file.id)}
          onRemove={() =>
            run(
              deleteStageFile(projectId, stage.id, file.id),
              `Não foi possível remover ${file.name}.`,
            )
          }
        />
      ))}
    </section>
  );
}

function TaskRow({ projectId, task, run }: { projectId: string; task: ExecutionTask; run: Run }) {
  const [title, setTitle] = useState<string>();

  async function rename(event: FormEvent) {
    event.preventDefault();
    if (await run(updateTask(projectId, task.id, { title }), "Não foi possível renomear a tarefa."))
      setTitle(undefined);
  }

  return (
    <div className="check-label">
      <Checkbox
        aria-label={task.title}
        checked={task.done}
        onCheckedChange={(checked) =>
          run(
            updateTask(projectId, task.id, { done: checked === true }),
            "Não foi possível salvar a alteração.",
          )
        }
      />
      {title === undefined ? (
        <>
          <span>{task.title}</span>
          <Button
            variant="ghost"
            aria-label={`Renomear tarefa ${task.title}`}
            onClick={() => setTitle(task.title)}
          >
            Renomear
          </Button>
        </>
      ) : (
        <form className="check-label" onSubmit={rename}>
          <Input
            aria-label={`Novo nome da tarefa ${task.title}`}
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button type="submit" variant="outline">
            Salvar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setTitle(undefined)}>
            Cancelar
          </Button>
        </form>
      )}
      <Button
        variant="ghost"
        aria-label={`Remover tarefa ${task.title}`}
        onClick={() => run(deleteTask(projectId, task.id), "Não foi possível remover a tarefa.")}
      >
        Remover
      </Button>
    </div>
  );
}

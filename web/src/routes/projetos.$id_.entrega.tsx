import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  attachmentSizeError,
  deleteDraftFile,
  getDeliveries,
  publishDelivery,
  uploadDraftFile,
  type Deliveries,
  type FieldErrors,
  type Outcome,
} from "@/api";
import { fileMeta, precheck } from "@/attachments";
import { Badge, Banner, Button, Field, FileRow, Loading, UploadBox } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/entrega")({ component: DeliveryPage });

function DeliveryPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Deliveries>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [published, setPublished] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const outcome = await getDeliveries(id);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setLoadFailed(true);
    setDeliveries(outcome.value);
  }, [id, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function settle(request: Promise<Outcome>, failure: string) {
    const outcome = await request;
    if (outcome.kind === "unauthorized") {
      await navigate({ to: "/entrar" });
      return false;
    }
    if (outcome.kind === "invalid") setProblem(outcome.errors.file ?? failure);
    else if (outcome.kind === "failed")
      setProblem(outcome.status === 413 ? attachmentSizeError : failure);
    return outcome.kind === "ok";
  }

  async function upload(chosen: File[]) {
    setProblem(undefined);
    setPublished(false);
    for (const file of chosen) {
      const rejection = precheck(file);
      if (rejection) setProblem(rejection);
      else await settle(uploadDraftFile(id, file), `Não foi possível enviar ${file.name}.`);
    }
    await refresh();
  }

  async function remove(fileId: number, name: string) {
    setProblem(undefined);
    await settle(deleteDraftFile(id, fileId), `Não foi possível remover ${name}.`);
    await refresh();
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    setProblem(undefined);
    setErrors({});
    setPublished(false);
    const outcome = await publishDelivery(id, { title, message });
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "invalid") return setErrors(outcome.errors);
    if (outcome.kind === "failed") return setProblem("Não foi possível publicar a entrega.");
    setTitle("");
    setMessage("");
    setPublished(true);
    await refresh();
  }

  const files = deliveries?.draft?.files ?? [];

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO</span>
            <h1>Publicar entrega</h1>
            <Badge>Em execução</Badge>
            <p>Envie o material final com uma mensagem para o cliente.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/projetos/$id/execucao" params={{ id }}>
              <ArrowLeft />
              Voltar à execução
            </Link>
          </Button>
        </header>
        {loadFailed && (
          <Banner title="Não foi possível carregar a entrega." tone="danger">
            Tente novamente em instantes.
          </Banner>
        )}
        {problem && <Banner title={problem} tone="danger" />}
        {errors.files && <Banner title={errors.files} tone="danger" />}
        {published && <Banner title="Entrega publicada." tone="success" />}
        {!deliveries && !loadFailed && <Loading />}
        {deliveries && (
          <form className="surface" onSubmit={publish}>
            <Field
              label="Título"
              required
              value={title}
              error={errors.title}
              onChange={setTitle}
            />
            <Field
              label="Mensagem"
              area
              value={message}
              error={errors.message}
              onChange={setMessage}
            />
            <UploadBox onFiles={upload} />
            {files.map((file) => (
              <FileRow
                key={file.id}
                name={file.name}
                meta={fileMeta(file)}
                onRemove={() => remove(file.id, file.name)}
              />
            ))}
            <Banner title="O cliente verá a entrega pelo link do projeto.">
              Depois de publicada, a entrega não pode ser alterada.
            </Banner>
            <div className="form-actions">
              <Button type="submit">Publicar entrega</Button>
            </div>
          </form>
        )}
        {deliveries?.published.map((delivery) => (
          <section key={delivery.number} className="surface">
            <h2>{`Entrega ${delivery.number} · ${delivery.title}`}</h2>
            {delivery.message && <p>{delivery.message}</p>}
            {delivery.files.map((file) => (
              <FileRow key={file.id} name={file.name} meta={fileMeta(file)} />
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

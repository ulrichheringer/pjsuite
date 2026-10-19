import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { completeProject, deliveryPhaseLabels, getDeliveries, type Deliveries } from "@/api";
import { Badge, Banner, Blank, Button, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/conclusao")({ component: CompletionPage });

function CompletionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Deliveries>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    const outcome = await getDeliveries(id);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setLoadFailed(true);
    setDeliveries(outcome.value);
  }, [id, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function complete() {
    setPending(true);
    setFailed(false);
    const outcome = await completeProject(id);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setFailed(true);
    await refresh();
  }

  const latest = deliveries?.published[0];
  const approval = latest?.response?.kind === "approve" ? latest.response : undefined;

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO</span>
            <h1>Concluir projeto</h1>
            {deliveries && <Badge>{deliveryPhaseLabels[deliveries.phase]}</Badge>}
          </div>
          <Button asChild variant="outline">
            <Link to="/projetos/$id/entrega" params={{ id }}>
              <ArrowLeft />
              Voltar à entrega
            </Link>
          </Button>
        </header>
        {loadFailed && (
          <Banner title="Não foi possível carregar a conclusão." tone="danger">
            Tente novamente em instantes.
          </Banner>
        )}
        {failed && (
          <Banner title="Não foi possível concluir o projeto." tone="danger">
            Confirme que a última entrega está aprovada e tente novamente.
          </Banner>
        )}
        {!deliveries && !loadFailed && <Loading />}
        {deliveries?.phase === "completed" && <Banner title="Projeto concluído." tone="success" />}
        {deliveries && !approval && (
          <Blank
            title="Aguardando a aprovação do cliente."
            description="O projeto só pode ser concluído depois que o cliente aprovar a última entrega."
          />
        )}
        {latest && approval && (
          <section className="surface">
            <h2>{`Entrega ${latest.number} · ${latest.title}`}</h2>
            <p>Aprovada em {new Date(approval.createdAt).toLocaleDateString("pt-BR")}</p>
            {deliveries?.phase !== "completed" && (
              <>
                <Banner title="A conclusão é definitiva.">
                  Depois de concluído, o projeto fica congelado e não pode ser reaberto.
                </Banner>
                <div className="form-actions">
                  <Button onClick={complete} disabled={pending}>
                    Concluir projeto
                  </Button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

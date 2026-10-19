import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Circle } from "lucide-react";
import { finalizeContract, getClientView, getProject, type ClientView } from "@/api";
import { ContractPaper } from "@/contract-paper";
import { Stepper } from "@/stepper";
import { Badge, Banner, Button, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/contrato/")({ component: ContractPage });

function checklist(view: ClientView) {
  return [
    { label: "Cliente identificado", done: view.client.name !== "" },
    { label: "Escopo preenchido", done: Boolean(view.scope?.scope) },
    { label: "Prazos definidos", done: (view.stages?.length ?? 0) > 0 },
    { label: "Preço e condições", done: (view.price?.priceCents ?? 0) > 0 },
  ];
}

function ContractPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<ClientView>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [problem, setProblem] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([getProject(id), getClientView(id)]).then(([project, preview]) => {
      if (project.kind === "unauthorized" || preview.kind === "unauthorized") {
        return navigate({ to: "/entrar" });
      }
      if (project.kind !== "ok" || preview.kind !== "ok") return setLoadFailed(true);
      if (project.value.status !== "draft") {
        return navigate({ to: "/projetos/$id/contrato/$version", params: { id, version: "1" } });
      }
      setView(preview.value);
    });
  }, [id, navigate]);

  if (!view) {
    return (
      <div className="product">
        <main className="pro-main">
          {loadFailed ? (
            <Banner title="Não foi possível carregar o contrato." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function finalize() {
    setPending(true);
    const outcome = await finalizeContract(id);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setProblem(true);
    return navigate({
      to: "/projetos/$id/contrato/$version",
      params: { id, version: String(outcome.value.number) },
    });
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Tudo combinado, por escrito.</h1>
            <p>
              Versão 1 · {view.professional.name} · {view.client.name}
            </p>
          </div>
          <Badge>Rascunho</Badge>
        </header>
        <Stepper id={id} current="contrato" />
        {problem && (
          <Banner title="Não foi possível finalizar o projeto." tone="danger">
            Nada foi alterado. Tente novamente.
          </Banner>
        )}
        <Banner title="Confira antes de finalizar.">
          A versão final preserva escopo, valor e condições. Alterações posteriores geram uma nova
          versão.
        </Banner>
        <div className="contract-layout">
          <ContractPaper view={view} version={1} />
          <aside className="surface contract-aside">
            <h2>Conferência final</h2>
            {checklist(view).map(({ label, done }) => (
              <p className="check-line" key={label}>
                {done ? <Check size={16} /> : <Circle size={16} />}
                {label}
              </p>
            ))}
            <p className="small">
              Texto demonstrativo. O conteúdo contratual definitivo será definido na implementação.
            </p>
            <Button className="full" disabled={pending} onClick={finalize}>
              {pending ? "Finalizando…" : "Finalizar projeto"}
              <ArrowRight />
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}

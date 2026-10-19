import { Link, createFileRoute } from "@tanstack/react-router";
import { stageStatusLabels } from "@/api";
import { PortalPage } from "@/portal";
import { Badge, Blank } from "@/ui";

export const Route = createFileRoute("/p/$token_/acompanhar")({ component: ProgressPage });

function ProgressPage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>
      {(portal) => (
        <section className="surface">
          <h1>Acompanhar projeto</h1>
          <p>{portal.content.project}</p>
          {portal.progress?.length ? (
            <ul>
              {portal.progress.map((stage) => (
                <li key={stage.name} className="row-between">
                  <strong>{stage.name}</strong>
                  <Badge>{stageStatusLabels[stage.status]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Blank
              title="Nenhuma etapa para acompanhar."
              description="As etapas visíveis aparecem aqui conforme o trabalho avança."
            />
          )}
          {portal.deliveries?.length ? (
            <Link to="/p/$token/entrega" params={{ token }}>
              Ver entrega
            </Link>
          ) : null}
          <Link to="/p/$token" params={{ token }}>
            Voltar ao contrato
          </Link>
        </section>
      )}
    </PortalPage>
  );
}

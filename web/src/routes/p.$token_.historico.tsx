import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { eventTitle, getPortalEvents, type PortalEvent } from "@/api";
import { PortalPage } from "@/portal";
import { Banner, Blank, Loading, Timeline } from "@/ui";

export const Route = createFileRoute("/p/$token_/historico")({ component: ClientHistoryPage });

function ClientHistory({ token }: { token: string }) {
  const [events, setEvents] = useState<PortalEvent[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getPortalEvents(token).then((outcome) => {
      if (outcome.kind !== "ok") return setFailed(true);
      setEvents(outcome.value);
    });
  }, [token]);

  if (failed) {
    return (
      <Banner title="Não foi possível carregar o histórico." tone="danger">
        Tente novamente em instantes.
      </Banner>
    );
  }
  if (!events) return <Loading />;
  if (events.length === 0) {
    return (
      <Blank
        title="Nenhum evento compartilhado ainda."
        description="As ações compartilhadas do projeto aparecem aqui."
      />
    );
  }
  return (
    <Timeline
      events={events.map((e) => ({
        title: eventTitle(e),
        author: e.actorName,
        at: e.createdAt,
      }))}
    />
  );
}

function ClientHistoryPage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>
      {() => (
        <section className="surface">
          <h1>Histórico do projeto</h1>
          <ClientHistory token={token} />
          <Link to="/p/$token/acompanhar" params={{ token }}>
            Voltar ao acompanhamento
          </Link>
        </section>
      )}
    </PortalPage>
  );
}

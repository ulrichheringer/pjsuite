import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { eventTitle, getProjectEvents, type ProjectEvent } from "@/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banner, Blank, Button, Loading, Timeline } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/historico")({ component: HistoryPage });

function HistoryPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ProjectEvent[]>();
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<"all" | "client">("all");

  useEffect(() => {
    getProjectEvents(id).then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setFailed(true);
      setEvents(outcome.value);
    });
  }, [id, navigate]);

  const shown = filter === "client" ? events?.filter((e) => e.actor === "client") : events;

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO</span>
            <h1>Histórico do projeto</h1>
            <p>Versões, decisões e entregas, com autoria e data.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/projetos/$id" params={{ id }}>
              <ArrowLeft />
              Voltar ao projeto
            </Link>
          </Button>
        </header>
        {failed && (
          <Banner title="Não foi possível carregar o histórico." tone="danger">
            Tente novamente em instantes.
          </Banner>
        )}
        {!shown && !failed && <Loading />}
        {events?.length === 0 && (
          <Blank
            title="Nenhum evento registrado ainda."
            description="As ações do projeto aparecem aqui conforme acontecem."
          />
        )}
        {shown && events && events.length > 0 && (
          <section className="surface">
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value === "client" ? "client" : "all")}
            >
              <TabsList variant="line">
                <TabsTrigger value="all">Tudo</TabsTrigger>
                <TabsTrigger value="client">Ações do cliente</TabsTrigger>
              </TabsList>
            </Tabs>
            <Timeline
              events={shown.map((e) => ({
                title: eventTitle(e),
                author: e.actorName,
                at: e.createdAt,
              }))}
            />
          </section>
        )}
      </main>
    </div>
  );
}

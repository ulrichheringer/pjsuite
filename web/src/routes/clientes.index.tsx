import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, Search } from "lucide-react";
import { listClients, moveClient, type Client } from "@/api";
import { Avatar, Banner, Blank, Button, Loading } from "@/ui";

export const Route = createFileRoute("/clientes/")({ component: ClientsPage });

const stages: { value: Client["stage"]; label: string; dot: string }[] = [
  { value: "recent", label: "Contato recente", dot: "" },
  { value: "proposal", label: "Proposta enviada", dot: "stage-proposta-enviada" },
  { value: "active", label: "Projeto ativo", dot: "stage-projeto-ativo" },
];

function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>();
  const [failed, setFailed] = useState(false);
  const [moveFailed, setMoveFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listClients().then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setFailed(true);
      setClients(outcome.value);
    });
  }, [navigate]);

  async function move(client: Client, stage: Client["stage"]) {
    const outcome = await moveClient(client.id, stage);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    setMoveFailed(outcome.kind !== "ok");
    if (outcome.kind === "ok") {
      setClients(clients?.map((c) => (c.id === client.id ? { ...c, stage } : c)));
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = (clients ?? []).filter((c) =>
    [c.name, c.email, c.company].some((value) => value.toLowerCase().includes(needle)),
  );

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Clientes</h1>
            <p>Boas relações começam com os detalhes certos.</p>
          </div>
          <Button asChild>
            <Link to="/clientes/novo">
              <Plus />
              Novo cliente
            </Link>
          </Button>
        </header>
        {failed ? (
          <Banner title="Não foi possível carregar os clientes." tone="danger">
            Tente novamente em instantes.
          </Banner>
        ) : !clients ? (
          <Loading />
        ) : !clients.length ? (
          <Blank
            title="Nenhum cliente ainda."
            description="Cadastre o primeiro cliente para começar."
            action="Novo cliente"
            onClick={() => navigate({ to: "/clientes/novo" })}
          />
        ) : (
          <>
            {moveFailed && (
              <Banner title="Não foi possível mover o cliente." tone="danger">
                Ele continua na etapa anterior. Tente novamente.
              </Banner>
            )}
            <div className="list-toolbar">
              <div className="search-field">
                <Search size={18} />
                <input
                  aria-label="Buscar cliente"
                  placeholder="Buscar por nome, e-mail ou empresa"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="client-board">
              {stages.map((stage, index) => {
                const next = stages[index + 1];
                const inStage = visible.filter((c) => c.stage === stage.value);
                return (
                  <section className="client-column" key={stage.value} aria-label={stage.label}>
                    <header>
                      <div>
                        <span className={`stage-dot ${stage.dot}`} />
                        <strong>{stage.label}</strong>
                      </div>
                      <span>{inStage.length}</span>
                    </header>
                    <div className="client-column-body">
                      {inStage.map((c) => (
                        <article className="client-card" key={c.id}>
                          <div className="client-card-head">
                            <div className="person">
                              <Avatar name={c.name} />
                              <div>
                                <strong>{c.name}</strong>
                                <small>{c.email || c.company}</small>
                              </div>
                            </div>
                          </div>
                          {next && (
                            <Button
                              variant="ghost"
                              className="advance-client"
                              onClick={() => move(c, next.value)}
                            >
                              Mover para {next.label.toLowerCase()}
                              <ArrowRight size={15} />
                            </Button>
                          )}
                        </article>
                      ))}
                      {!inStage.length && (
                        <div className="client-column-empty">Nenhum cliente nesta etapa.</div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

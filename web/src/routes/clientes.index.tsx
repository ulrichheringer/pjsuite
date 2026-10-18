import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MoreHorizontal, Plus, Search } from "lucide-react";
import {
  archiveClient,
  listClients,
  moveClient,
  restoreClient,
  type Client,
  type Outcome,
} from "@/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, Banner, Blank, Button, Loading } from "@/ui";

export const Route = createFileRoute("/clientes/")({ component: ClientsPage });

const stages: { value: Client["stage"]; label: string; dot: string }[] = [
  { value: "recent", label: "Contato recente", dot: "" },
  { value: "proposal", label: "Proposta enviada", dot: "stage-proposta-enviada" },
  { value: "active", label: "Projeto ativo", dot: "stage-projeto-ativo" },
];

const byName = (a: Client, b: Client) => a.name.localeCompare(b.name);

function ClientsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<Client[]>();
  const [archived, setArchived] = useState<Client[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [failed, setFailed] = useState(false);
  const [actionFailure, setActionFailure] = useState<string>();
  const [toArchive, setToArchive] = useState<Client>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([listClients(), listClients(true)]).then(([current, old]) => {
      if (current.kind === "unauthorized" || old.kind === "unauthorized") {
        return navigate({ to: "/entrar" });
      }
      if (current.kind !== "ok" || old.kind !== "ok") return setFailed(true);
      setActive(current.value);
      setArchived(old.value);
    });
  }, [navigate]);

  async function run(failure: string, action: () => Promise<Outcome>, onDone: () => void) {
    const outcome = await action();
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    setActionFailure(outcome.kind === "ok" ? undefined : failure);
    if (outcome.kind === "ok") onDone();
  }

  const move = (client: Client, stage: Client["stage"]) =>
    run(
      "Não foi possível mover o cliente.",
      () => moveClient(client.id, stage),
      () => setActive((list) => list?.map((c) => (c.id === client.id ? { ...c, stage } : c))),
    );

  const archive = (client: Client) =>
    run(
      "Não foi possível arquivar o cliente.",
      () => archiveClient(client.id),
      () => {
        setActive((list) => list?.filter((c) => c.id !== client.id));
        setArchived((list) => [{ ...client, archived: true }, ...list].sort(byName));
        toast.success(`${client.name} arquivado.`);
      },
    );

  const restore = (client: Client) =>
    run(
      "Não foi possível restaurar o cliente.",
      () => restoreClient(client.id),
      () => {
        setArchived((list) => list.filter((c) => c.id !== client.id));
        setActive((list) => [...(list ?? []), { ...client, archived: false }].sort(byName));
        toast.success(`${client.name} restaurado.`);
      },
    );

  const needle = query.trim().toLowerCase();
  const matches = (list: Client[]) =>
    list.filter((c) =>
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
        ) : !active ? (
          <Loading />
        ) : !active.length && !archived.length ? (
          <Blank
            title="Nenhum cliente ainda."
            description="Cadastre o primeiro cliente para começar."
            action="Novo cliente"
            onClick={() => navigate({ to: "/clientes/novo" })}
          />
        ) : (
          <>
            {actionFailure && (
              <Banner title={actionFailure} tone="danger">
                Nada foi alterado. Tente novamente.
              </Banner>
            )}
            <div className="list-toolbar">
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value === "archived" ? "archived" : "active")}
              >
                <TabsList variant="line">
                  <TabsTrigger value="active">
                    Ativos <span className="tab-count">{active.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    Arquivados <span className="tab-count">{archived.length}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
            {tab === "active" ? (
              <div className="client-board">
                {stages.map((stage, index) => {
                  const next = stages[index + 1];
                  const inStage = matches(active).filter((c) => c.stage === stage.value);
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Ações de ${c.name}`}
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate({
                                        to: "/clientes/$id",
                                        params: { id: String(c.id) },
                                      })
                                    }
                                  >
                                    Editar cliente
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setToArchive(c)}>
                                    Arquivar cliente
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
            ) : matches(archived).length ? (
              <div className="client-board">
                {matches(archived).map((c) => (
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
                    <Button variant="ghost" className="advance-client" onClick={() => restore(c)}>
                      Restaurar
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <Blank
                title={
                  archived.length ? "Nenhum resultado para a busca." : "Nenhum cliente arquivado."
                }
                description={
                  archived.length
                    ? "Tente outro nome, e-mail ou empresa."
                    : "Clientes arquivados aparecem aqui e podem ser restaurados."
                }
              />
            )}
          </>
        )}
        <AlertDialog open={!!toArchive} onOpenChange={(open) => !open && setToArchive(undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar {toArchive?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                O histórico é mantido e você pode restaurar o cliente a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => toArchive && archive(toArchive)}>
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

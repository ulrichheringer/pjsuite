import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Briefcase, Copy, MoreHorizontal, Plus, Search } from "lucide-react";
import {
  archiveProject,
  duplicateProject,
  listClients,
  listProjects,
  type Client,
  type FieldErrors,
  type Project,
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientSelect } from "@/project-fields";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, Banner, Blank, Button, Field, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/")({ component: ProjectsPage });

function ProjectsPage() {
  const [created, setCreated] = useState(false);
  const [toDuplicate, setToDuplicate] = useState<Project>();
  const navigate = useNavigate();
  const [active, setActive] = useState<Project[]>();
  const [archived, setArchived] = useState<Project[]>([]);
  const [toArchive, setToArchive] = useState<Project>();
  const [actionFailure, setActionFailure] = useState<string>();

  async function archive(project: Project) {
    const outcome = await archiveProject(project.id);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setActionFailure("Não foi possível arquivar o projeto.");
    setActionFailure(undefined);
    setActive((list) => list?.filter((p) => p.id !== project.id));
    setArchived((list) => [{ ...project, archived: true }, ...list]);
    toast.success("Projeto arquivado.");
  }
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([listProjects(), listProjects(true)]).then(([current, old]) => {
      if (current.kind === "unauthorized" || old.kind === "unauthorized") {
        return navigate({ to: "/entrar" });
      }
      if (current.kind !== "ok" || old.kind !== "ok") return setFailed(true);
      setActive(current.value);
      setArchived(old.value);
    });
  }, [navigate]);

  const needle = query.trim().toLowerCase();
  const shown = (tab === "active" ? (active ?? []) : archived).filter((p) =>
    [p.name, p.clientName, p.reference].some((value) => value.toLowerCase().includes(needle)),
  );

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Cada projeto, uma história.</h1>
            <p>Do primeiro combinado à entrega final.</p>
          </div>
          <Button asChild>
            <Link to="/projetos/novo">
              <Plus />
              Novo projeto
            </Link>
          </Button>
        </header>
        {created && <Banner title="Projeto criado." tone="success" />}
        {actionFailure && (
          <Banner title={actionFailure} tone="danger">
            Nada foi alterado. Tente novamente.
          </Banner>
        )}
        {failed ? (
          <Banner title="Não foi possível carregar os projetos." tone="danger">
            Tente novamente em instantes.
          </Banner>
        ) : !active ? (
          <Loading />
        ) : (
          <>
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
                  aria-label="Buscar projeto"
                  placeholder="Buscar projeto ou cliente"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            {shown.length ? (
              <div className="project-grid">
                {shown.map((p) => (
                  <article className="project-card" key={p.id}>
                    <div className="row-between">
                      <span className="project-icon">
                        <Briefcase size={22} />
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Ações de ${p.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({ to: "/projetos/$id", params: { id: String(p.id) } })
                            }
                          >
                            Editar projeto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setToDuplicate(p)}>
                            Duplicar projeto
                          </DropdownMenuItem>
                          {!p.archived && (
                            <DropdownMenuItem onClick={() => setToArchive(p)}>
                              Arquivar projeto
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <small>{p.area}</small>
                    <Link
                      to="/projetos/$id"
                      params={{ id: String(p.id) }}
                      className="project-title"
                    >
                      {p.name}
                      <ArrowUpRight className="project-arrow" />
                    </Link>
                    <p>{p.clientName}</p>
                    <Badge>Rascunho</Badge>
                    {p.reference && (
                      <footer>
                        <span>{p.reference}</span>
                      </footer>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Blank
                title={
                  query
                    ? "Nenhum projeto encontrado."
                    : tab === "archived"
                      ? "Nenhum projeto arquivado."
                      : "Um bom projeto começa com um combinado."
                }
                description={
                  query
                    ? "Busque pelo nome do projeto, do cliente ou pela referência."
                    : tab === "archived"
                      ? "Projetos arquivados aparecerão aqui, com o histórico preservado."
                      : "Crie seu primeiro projeto e reúna todos os detalhes."
                }
                action={
                  query
                    ? "Limpar busca"
                    : tab === "archived"
                      ? "Ver projetos ativos"
                      : "Criar projeto"
                }
                onClick={() =>
                  query
                    ? setQuery("")
                    : tab === "archived"
                      ? setTab("active")
                      : navigate({ to: "/projetos/novo" })
                }
              />
            )}
          </>
        )}
        <AlertDialog open={!!toArchive} onOpenChange={(open) => !open && setToArchive(undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar este projeto?</AlertDialogTitle>
              <AlertDialogDescription>
                {toArchive?.name} sairá da lista de ativos. O contrato, o link e o histórico
                permanecem disponíveis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Manter ativo</AlertDialogCancel>
              <AlertDialogAction onClick={() => toArchive && archive(toArchive)}>
                Arquivar projeto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {toDuplicate && (
          <DuplicateDialog
            key={toDuplicate.id}
            source={toDuplicate}
            onClose={() => setToDuplicate(undefined)}
            onCreated={(project) => {
              setActive((list) => [project, ...(list ?? [])]);
              setTab("active");
              setCreated(true);
              setToDuplicate(undefined);
            }}
          />
        )}
      </main>
    </div>
  );
}

function DuplicateDialog({
  source,
  onClose,
  onCreated,
}: {
  source: Project;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(`${source.name} — cópia`);
  const [clientId, setClientId] = useState(source.clientId);
  const [clients, setClients] = useState<Pick<Client, "id" | "name">[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listClients().then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return;
      setClients(outcome.value);
      if (!outcome.value.some((c) => c.id === source.clientId)) {
        setClientId(outcome.value[0]?.id ?? source.clientId);
      }
    });
  }, [navigate, source.clientId]);

  async function submit() {
    setPending(true);
    const outcome = await duplicateProject(source.id, { name, clientId });
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind === "ok") return onCreated(outcome.value);
    setErrors(outcome.kind === "invalid" ? outcome.errors : { name: "Não foi possível duplicar." });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Um novo começo, com a mesma base.</DialogTitle>
        <DialogDescription>
          Copie escopo, etapas e condições. Assinatura, link e histórico não serão copiados.
        </DialogDescription>
        <Field label="Nome do novo projeto" value={name} onChange={setName} error={errors.name} />
        <ClientSelect
          value={clientId}
          clients={clients}
          error={errors.client}
          onChange={setClientId}
        />
        <Button onClick={submit} disabled={pending}>
          {pending ? "Duplicando…" : "Duplicar como rascunho"}
          <Copy />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

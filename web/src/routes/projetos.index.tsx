import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Briefcase, Plus, Search } from "lucide-react";
import { listProjects, type Project } from "@/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, Banner, Blank, Button, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/")({
  component: ProjectsPage,
  validateSearch: (search): { criado?: true } => (search.criado ? { criado: true } : {}),
});

function ProjectsPage() {
  const created = !!Route.useSearch().criado;
  const navigate = useNavigate();
  const [active, setActive] = useState<Project[]>();
  const [archived, setArchived] = useState<Project[]>([]);
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
      </main>
    </div>
  );
}

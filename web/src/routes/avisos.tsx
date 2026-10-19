import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { eventTitle, markAllNotificationsRead, markNotificationRead } from "@/api";
import { ProNav, useNotifications } from "@/pro-nav";
import { Badge, Banner, Blank, Button, Loading } from "@/ui";

export const Route = createFileRoute("/avisos")({ component: NoticesPage });

function NoticesPage() {
  const navigate = useNavigate();
  const { notifications, setNotifications, failed } = useNotifications();

  async function markRead(id: number) {
    const outcome = await markNotificationRead(id);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return;
    setNotifications(
      (current) =>
        current && {
          unread: current.unread - 1,
          items: current.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
        },
    );
  }

  async function markAllRead() {
    const outcome = await markAllNotificationsRead();
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return;
    setNotifications(
      (current) =>
        current && { unread: 0, items: current.items.map((n) => ({ ...n, read: true })) },
    );
  }

  return (
    <div className="product">
      <main className="pro-main">
        <ProNav unread={notifications?.unread ?? 0} />
        <header className="page-heading">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO</span>
            <h1>Avisos</h1>
            <p>Ações dos clientes que precisam da sua atenção.</p>
          </div>
          {!!notifications?.unread && (
            <Button variant="outline" onClick={markAllRead}>
              Marcar todas como lidas
            </Button>
          )}
        </header>
        {failed && (
          <Banner title="Não foi possível carregar os avisos." tone="danger">
            Tente novamente em instantes.
          </Banner>
        )}
        {!notifications && !failed && <Loading />}
        {notifications?.items.length === 0 && (
          <Blank
            title="Nenhum aviso por enquanto."
            description="Quando um cliente visualizar, responder ou assinar, o aviso aparece aqui."
          />
        )}
        {notifications && notifications.items.length > 0 && (
          <ul className="surface">
            {notifications.items.map((n) => (
              <li key={n.id} className="row-between">
                <div>
                  <strong>{eventTitle(n)}</strong>
                  <p>
                    {n.projectName} · {n.actorName} ·{" "}
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {!n.read && <Badge>Novo</Badge>}
                </div>
                <div className="form-actions">
                  <Button asChild variant="outline">
                    <Link to="/projetos/$id" params={{ id: String(n.projectId) }}>
                      Abrir projeto
                    </Link>
                  </Button>
                  {!n.read && (
                    <Button variant="outline" onClick={() => markRead(n.id)}>
                      Marcar como lida
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

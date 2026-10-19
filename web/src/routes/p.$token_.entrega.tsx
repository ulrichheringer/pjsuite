import { Link, createFileRoute } from "@tanstack/react-router";
import { fileSize } from "@/attachments";
import { PortalPage } from "@/portal";
import { Blank, FileRow } from "@/ui";

export const Route = createFileRoute("/p/$token_/entrega")({ component: DeliveryPage });

function DeliveryPage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>
      {(portal) => (
        <>
          <section className="surface">
            <h1>Ver entrega</h1>
            <p>{portal.content.project}</p>
            {!portal.deliveries?.length && (
              <Blank
                title="Nenhuma entrega publicada."
                description="Quando o profissional publicar uma entrega, ela aparece aqui."
              />
            )}
            <Link to="/p/$token/acompanhar" params={{ token }}>
              Voltar ao acompanhamento
            </Link>
          </section>
          {portal.deliveries?.map((delivery) => (
            <section key={delivery.number} className="surface">
              <h2>{delivery.title}</h2>
              <p className="small">
                Entrega {delivery.number} ·{" "}
                {new Date(delivery.publishedAt).toLocaleDateString("pt-BR")}
              </p>
              {delivery.message && <p>{delivery.message}</p>}
              {delivery.files.map((file) => (
                <FileRow
                  key={file.id}
                  name={file.name}
                  meta={fileSize(file.size)}
                  href={`/api/portal/${encodeURIComponent(token)}/deliveries/${delivery.number}/files/${file.id}`}
                />
              ))}
            </section>
          ))}
        </>
      )}
    </PortalPage>
  );
}

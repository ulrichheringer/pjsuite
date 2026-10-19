import { Link, createFileRoute } from "@tanstack/react-router";
import { ClientPreview } from "@/client-preview";
import { PortalPage } from "@/portal";
import { Banner, Button } from "@/ui";

export const Route = createFileRoute("/p/$token")({ component: ReviewPage });

function ReviewPage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>
      {(portal) => (
        <>
          <div className="client-preview-body">
            <ClientPreview view={portal.content} />
          </div>
          {portal.status === "refused" ? (
            <Banner title="Você recusou este projeto." />
          ) : (
            <div className="form-actions">
              <Button asChild>
                <Link to="/p/$token/alteracao" params={{ token }}>
                  Solicitar alteração
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/p/$token/recusar" params={{ token }}>
                  Recusar
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </PortalPage>
  );
}

import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { refuseProject, type FieldErrors } from "@/api";
import { PortalPage } from "@/portal";
import { Banner, Button, Field } from "@/ui";

export const Route = createFileRoute("/p/$token_/recusar")({ component: RefusePage });

function RefusePage() {
  const { token } = Route.useParams();
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFailed(false);
    const outcome = await refuseProject(token, reason);
    setPending(false);
    if (outcome.kind === "ok") return setDone(true);
    if (outcome.kind === "invalid") return setErrors(outcome.errors);
    setErrors({});
    setFailed(true);
  }

  return (
    <PortalPage token={token}>
      {(portal) =>
        done ? (
          <Banner title="Recusa registrada.">
            {portal.content.professional.name} será avisada da sua decisão.
          </Banner>
        ) : (
          <form className="surface" onSubmit={submit}>
            <h1>Recusar projeto</h1>
            <p>{portal.content.project}</p>
            {failed && (
              <Banner title="Não foi possível registrar a recusa." tone="danger">
                Tente novamente em instantes.
              </Banner>
            )}
            <Field
              label="Motivo (opcional)"
              area
              value={reason}
              error={errors.reason}
              onChange={setReason}
            />
            <Button type="submit" variant="destructive" disabled={pending}>
              Confirmar recusa
            </Button>
          </form>
        )
      }
    </PortalPage>
  );
}

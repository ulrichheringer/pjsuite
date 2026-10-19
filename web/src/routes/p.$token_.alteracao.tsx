import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requestChange, type FieldErrors } from "@/api";
import { PortalPage } from "@/portal";
import { Banner, Button, Field } from "@/ui";

export const Route = createFileRoute("/p/$token_/alteracao")({ component: ChangePage });

function ChangePage() {
  const { token } = Route.useParams();
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState<"none" | "error" | "refused">("none");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFailed("none");
    const outcome = await requestChange(token, message);
    setPending(false);
    if (outcome.kind === "ok") return setSent(true);
    if (outcome.kind === "invalid" && outcome.status !== 409) return setErrors(outcome.errors);
    setErrors({});
    setFailed(
      (outcome.kind === "invalid" || outcome.kind === "failed") && outcome.status === 409
        ? "refused"
        : "error",
    );
  }

  return (
    <PortalPage token={token}>
      {(portal) =>
        sent ? (
          <Banner title="Solicitação enviada." tone="success">
            {portal.content.professional.name} vai receber o seu pedido.
          </Banner>
        ) : (
          <form className="surface" onSubmit={submit}>
            <h1>Solicitar alteração</h1>
            <p>{portal.content.project}</p>
            {failed === "error" && (
              <Banner title="Não foi possível enviar a solicitação." tone="danger">
                Tente novamente em instantes.
              </Banner>
            )}
            {failed === "refused" && <Banner title="Este projeto já foi recusado." tone="danger" />}
            <Field
              label="O que deve mudar?"
              area
              required
              value={message}
              error={errors.message}
              onChange={setMessage}
            />
            <Button type="submit" disabled={pending}>
              Enviar solicitação
            </Button>
          </form>
        )
      }
    </PortalPage>
  );
}

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
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFailed(false);
    const outcome = await requestChange(token, message);
    setPending(false);
    if (outcome.kind === "ok") return setSent(true);
    if (outcome.kind === "invalid") return setErrors(outcome.errors);
    setErrors({});
    setFailed(true);
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
            {failed && (
              <Banner title="Não foi possível enviar a solicitação." tone="danger">
                Tente novamente em instantes.
              </Banner>
            )}
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

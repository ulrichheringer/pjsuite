import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adjustDelivery, type FieldErrors, type Portal } from "@/api";
import { PortalPage, openDelivery } from "@/portal";
import { Banner, Button, Field } from "@/ui";

export const Route = createFileRoute("/p/$token_/ajuste")({ component: AdjustPage });

const closedTitle = "Esta entrega não aceita mais respostas.";

function AdjustPage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>
      {(portal) => {
        const delivery = openDelivery(portal);
        return delivery ? (
          <AdjustForm token={token} delivery={delivery} />
        ) : (
          <Banner title={closedTitle} tone="danger" />
        );
      }}
    </PortalPage>
  );
}

function AdjustForm({
  token,
  delivery,
}: {
  token: string;
  delivery: NonNullable<Portal["deliveries"]>[number];
}) {
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState<"none" | "error" | "closed">("none");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFailed("none");
    const outcome = await adjustDelivery(token, delivery.number, message);
    setPending(false);
    if (outcome.kind === "ok") return setSent(true);
    if (outcome.kind === "invalid" && outcome.status === 400) return setErrors(outcome.errors);
    setErrors({});
    setFailed(
      (outcome.kind === "invalid" || outcome.kind === "failed") && outcome.status === 409
        ? "closed"
        : "error",
    );
  }

  if (sent) return <Banner title="Pedido de ajuste enviado." tone="success" />;

  return (
    <form className="surface" onSubmit={submit}>
      <h1>Solicitar ajuste</h1>
      <div className="context-card">
        <strong>{`Entrega ${delivery.number} · ${delivery.title}`}</strong>
      </div>
      {failed === "error" && (
        <Banner title="Não foi possível enviar o pedido." tone="danger">
          Tente novamente em instantes.
        </Banner>
      )}
      {failed === "closed" && <Banner title={closedTitle} tone="danger" />}
      <Field
        label="Qual ajuste é necessário?"
        area
        required
        value={message}
        error={errors.message}
        onChange={setMessage}
      />
      <Button type="submit" disabled={pending}>
        Enviar pedido de ajuste
      </Button>
    </form>
  );
}

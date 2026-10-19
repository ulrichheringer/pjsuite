import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { approveDelivery, type Approval, type FieldErrors, type Portal } from "@/api";
import { Checkbox } from "@/components/ui/checkbox";
import { PortalPage, openDelivery } from "@/portal";
import { Banner, Button } from "@/ui";

export const Route = createFileRoute("/p/$token_/aprovar")({ component: ApprovePage });

const closedTitle = "Esta entrega não aceita mais respostas.";

function ApprovePage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>
      {(portal) => {
        const delivery = openDelivery(portal);
        return delivery ? (
          <ApproveForm token={token} delivery={delivery} />
        ) : (
          <Banner title={closedTitle} tone="danger" />
        );
      }}
    </PortalPage>
  );
}

function ApproveForm({
  token,
  delivery,
}: {
  token: string;
  delivery: NonNullable<Portal["deliveries"]>[number];
}) {
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState<"none" | "error" | "closed">("none");
  const [pending, setPending] = useState(false);
  const [approval, setApproval] = useState<Approval>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFailed("none");
    const outcome = await approveDelivery(token, delivery.number, confirm);
    setPending(false);
    if (outcome.kind === "ok") return setApproval(outcome.value);
    if (outcome.kind === "invalid" && outcome.status === 400) return setErrors(outcome.errors);
    setErrors({});
    setFailed(
      (outcome.kind === "invalid" || outcome.kind === "failed") && outcome.status === 409
        ? "closed"
        : "error",
    );
  }

  if (approval) {
    return (
      <>
        <Banner title="Entrega aprovada." tone="success" />
        <section className="surface">
          <h2>Recibo de aprovação</h2>
          <p>{`Entrega ${approval.number} · ${approval.title}`}</p>
          <p>Aprovada em {new Date(approval.approvedAt).toLocaleDateString("pt-BR")}</p>
        </section>
      </>
    );
  }

  return (
    <form className="surface" onSubmit={submit}>
      <h1>Aprovar entrega</h1>
      <p>{`Entrega ${delivery.number} · ${delivery.title}`}</p>
      {failed === "error" && (
        <Banner title="Não foi possível registrar a aprovação." tone="danger">
          Tente novamente em instantes.
        </Banner>
      )}
      {failed === "closed" && <Banner title={closedTitle} tone="danger" />}
      <label className="check-label">
        <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
        Confirmo que esta entrega está aprovada.
      </label>
      {errors.confirm && <p className="field-error">{errors.confirm}</p>}
      <Button type="submit" disabled={pending}>
        Aprovar entrega
      </Button>
    </form>
  );
}

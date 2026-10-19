import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPortal, signContract, type FieldErrors, type Portal, type Receipt } from "@/api";
import { Checkbox } from "@/components/ui/checkbox";
import { ContractPaper } from "@/contract-paper";
import { PortalPage, ReceiptCard } from "@/portal";
import { Banner, Button, Field } from "@/ui";

export const Route = createFileRoute("/p/$token_/assinar")({ component: SignPage });

type Failure = "none" | "error" | "stale" | "closed";

const failureTitles = {
  error: "Não foi possível assinar.",
  stale: "Uma nova versão foi publicada.",
  closed: "Este contrato não pode mais ser assinado.",
};

function SignPage() {
  const { token } = Route.useParams();
  return (
    <PortalPage token={token}>{(portal) => <SignForm token={token} portal={portal} />}</PortalPage>
  );
}

function SignForm({ token, portal: initial }: { token: string; portal: Portal }) {
  const [portal, setPortal] = useState(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<Failure>("none");
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(initial.signature);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFailure("none");
    const outcome = await signContract(token, { version: portal.version, name, email, consent });
    setPending(false);
    if (outcome.kind === "ok") return setReceipt(outcome.value);
    if (outcome.kind === "invalid" && outcome.status === 400) return setErrors(outcome.errors);
    setErrors({});
    const conflict =
      (outcome.kind === "invalid" || outcome.kind === "failed") && outcome.status === 409;
    if (!conflict) return setFailure("error");
    if (outcome.kind === "invalid") return setFailure("closed");
    setFailure("stale");
    const fresh = await getPortal(token);
    if (fresh.kind === "ok") setPortal(fresh.value);
  }

  if (receipt) {
    return (
      <>
        <Banner title="Contrato assinado." tone="success" />
        <ReceiptCard receipt={receipt} />
      </>
    );
  }

  return (
    <div className="contract-layout">
      <ContractPaper view={portal.content} version={portal.version} />
      <form className="surface contract-aside" onSubmit={submit}>
        <h1>Assinar versão {portal.version}</h1>
        {failure !== "none" && <Banner title={failureTitles[failure]} tone="danger" />}
        <Field label="Nome completo" required value={name} error={errors.name} onChange={setName} />
        <Field label="E-mail" required value={email} error={errors.email} onChange={setEmail} />
        <label className="check-label">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
          Li e concordo com esta versão do contrato.
        </label>
        {errors.consent && <p className="field-error">{errors.consent}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Assinando…" : "Assinar"}
        </Button>
      </form>
    </div>
  );
}

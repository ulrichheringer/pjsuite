import { paymentKindLabels, timingKindLabels, type ClientView } from "@/api";
import { money } from "@/format";
import { Logo } from "@/ui";

export function ContractPaper({ view, version }: { view: ClientView; version: number }) {
  const { professional, client } = view;
  const clauses: { title: string; lines: string[] }[] = [];
  if (view.scope) {
    clauses.push({
      title: "O trabalho combinado",
      lines: [view.scope.scope, view.scope.outcome].filter(Boolean),
    });
  }
  if (view.stages || view.deliverables) {
    clauses.push({
      title: "Entrega e prazo",
      lines: [
        ...(view.stages ?? []).map((stage) =>
          stage.timingKind === "none"
            ? `${stage.name} · ${timingKindLabels.none}`
            : `${stage.name} · ${timingKindLabels[stage.timingKind]}: ${stage.timing || "a definir"}`,
        ),
        ...(view.deliverables ?? []).map((item) => `Entregável de ${item.stage}: ${item.text}`),
      ],
    });
  }
  if (view.price) {
    const total = view.price.priceCents;
    clauses.push({
      title: "Valor e condições",
      lines: [
        `Valor total: ${money.format(total / 100)}.`,
        ...view.price.payments.map(
          (payment) =>
            `${paymentKindLabels[payment.kind]}: ${payment.percent}% (${money.format((total * payment.percent) / 100 / 100)})${payment.due ? ` · ${payment.due}` : ""}.`,
        ),
      ],
    });
  }
  if (view.attachments) {
    clauses.push({
      title: "Anexos",
      lines: view.attachments.map((file) => file.name),
    });
  }
  clauses.push({
    title: "Concordância",
    lines: [
      `A assinatura se refere exclusivamente à versão ${version} deste documento e aos serviços descritos acima. Alterações exigem nova versão e novo aceite.`,
    ],
  });
  return (
    <article className="contract-paper">
      <div className="row-between">
        <Logo />
        <span className="small">CONTRATO / V{version}</span>
      </div>
      <hr />
      <span className="eyebrow">PRESTAÇÃO DE SERVIÇOS</span>
      <h2>{view.project}</h2>
      <p className="contract-note">Documento demonstrativo para avaliação de interface.</p>
      <div className="contract-parties">
        <div>
          <small>PROFISSIONAL</small>
          <strong>{professional.company || professional.name}</strong>
          <p>{professional.email}</p>
        </div>
        <div>
          <small>CLIENTE</small>
          <strong>{client.name}</strong>
          <p>{client.email}</p>
        </div>
      </div>
      {clauses.flatMap((clause, i) => [
        <h3 key={`h${i}`}>
          {String(i + 1).padStart(2, "0")}. {clause.title}
        </h3>,
        ...clause.lines.map((line, j) => <p key={`p${i}-${j}`}>{line}</p>),
      ])}
      <div className="signature-lines">
        <span>
          {professional.name}
          <br />
          <small>Profissional</small>
        </span>
        <span>
          {client.name}
          <br />
          <small>Cliente</small>
        </span>
      </div>
    </article>
  );
}

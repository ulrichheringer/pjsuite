import type { ReactNode } from "react";
import { paymentKindLabels, timingKindLabels, type ClientView } from "@/api";
import { money } from "@/format";
import { FileRow, Section } from "@/ui";

const sizeText = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;

export function ClientPreview({ view }: { view: ClientView }) {
  const blocks: ReactNode[] = [];
  if (view.scope) {
    blocks.push(
      <Section key="scope" label="O que vamos criar">
        <p>{view.scope.scope}</p>
        {view.scope.outcome && <p>{view.scope.outcome}</p>}
      </Section>,
    );
  }
  if (view.stages) {
    blocks.push(
      <Section key="stages" label="Do primeiro encontro à entrega">
        <div className="phase-list">
          {view.stages.map((stage, i) => (
            <div key={i}>
              <span className="phase-number">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{stage.name}</strong>
                <small>
                  {stage.timingKind === "none"
                    ? timingKindLabels.none
                    : `${timingKindLabels[stage.timingKind]} · ${stage.timing || "prazo a definir"}`}
                </small>
              </div>
            </div>
          ))}
        </div>
      </Section>,
    );
  }
  if (view.deliverables) {
    blocks.push(
      <Section key="deliverables" label="O que você recebe">
        {view.deliverables.map((item, i) => (
          <p key={i}>
            <strong>{item.stage}</strong> · {item.text}
          </p>
        ))}
      </Section>,
    );
  }
  if (view.price) {
    blocks.push(
      <Section key="price" label="Investimento">
        <div className="price">{money.format(view.price.priceCents / 100)}</div>
        <div className="client-payment-plan">
          {view.price.payments.map((payment, i) => (
            <p key={i}>
              <strong>
                {payment.percent}% · {paymentKindLabels[payment.kind]}
              </strong>
              <span>{payment.due}</span>
            </p>
          ))}
        </div>
      </Section>,
    );
  }
  if (view.attachments) {
    blocks.push(
      <Section key="attachments" label="Arquivos do projeto">
        {view.attachments.map((file, i) => (
          <FileRow key={i} name={file.name} meta={sizeText(file.size)} />
        ))}
      </Section>,
    );
  }
  return (
    <>
      <div className="client-project-intro">
        <span className="eyebrow">
          {(view.professional.company || view.professional.name).toUpperCase()}
        </span>
        <h1>{view.project}</h1>
        <div className="client-byline">
          <span>
            Preparado por <strong>{view.professional.name}</strong> para{" "}
            <strong>{view.client.name}</strong>
          </span>
        </div>
      </div>
      {blocks}
    </>
  );
}

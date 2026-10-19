import { Link } from "@tanstack/react-router";

const steps = [
  { key: "montagem", label: "01 Montagem", to: "/projetos/$id/montagem" },
  { key: "visibilidade", label: "02 Visibilidade", to: "/projetos/$id/visibilidade" },
  { key: "contrato", label: "03 Contrato", to: "/projetos/$id/contrato" },
  { key: "compartilhar", label: "04 Compartilhar" },
] as const;

export function Stepper({ id, current }: { id: string; current: (typeof steps)[number]["key"] }) {
  return (
    <div className="stepper">
      {steps.map((step) =>
        step.key === current ? (
          <strong key={step.key}>{step.label}</strong>
        ) : "to" in step ? (
          <Link key={step.key} to={step.to} params={{ id }}>
            {step.label}
          </Link>
        ) : (
          <span key={step.key}>{step.label}</span>
        ),
      )}
    </div>
  );
}

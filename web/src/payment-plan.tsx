import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  getPayments,
  paymentKindLabels,
  paymentTriggerLabels,
  savePayments,
  type FieldErrors,
  type Payment,
} from "@/api";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Banner, Button, Field, Section } from "@/ui";

type Row = Payment & { key: number };

const presets: Record<string, Payment[]> = {
  "30% + saldo": [
    { kind: "entrada", percent: 30, trigger: "assinatura", due: "Na assinatura do contrato" },
    { kind: "saldo", percent: 70, trigger: "antes_entrega", due: "Antes da publicação final" },
  ],
  "3 parcelas": [
    { kind: "entrada", percent: 35, trigger: "assinatura", due: "Na assinatura do contrato" },
    { kind: "parcela", percent: 35, trigger: "etapa", due: "No início da execução" },
    { kind: "saldo", percent: 30, trigger: "antes_entrega", due: "Antes da publicação final" },
  ],
  "À vista": [
    { kind: "unico", percent: 100, trigger: "assinatura", due: "Na assinatura do contrato" },
  ],
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const centsText = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");

const parseCents = (text: string) => {
  const cents = Math.round(Number(text.replace(",", ".")) * 100);
  return Number.isNaN(cents) ? undefined : cents;
};

const maxRows = 12;

const choose = <K extends string>(labels: Record<K, string>, value: string) =>
  (Object.keys(labels) as K[]).find((key) => key === value);

function amounts(priceCents: number, rows: Row[]) {
  const values = rows.map((row) => Math.floor((priceCents * row.percent) / 100));
  const total = rows.reduce((sum, row) => sum + row.percent, 0);
  const remainder =
    Math.floor((priceCents * total) / 100) - values.reduce((sum, value) => sum + value, 0);
  const last = values.length - 1;
  if (last >= 0) values[last] = (values[last] ?? 0) + remainder;
  return values;
}

export function PaymentPlan({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const navigate = useNavigate();
  const nextKey = useRef(0);
  const [priceText, setPriceText] = useState("0");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getPayments(projectId).then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setLoadFailed(true);
      setPriceText(centsText(outcome.value.priceCents));
      setRows(outcome.value.payments.map((payment) => ({ ...payment, key: nextKey.current++ })));
    });
  }, [projectId, navigate]);

  const parsedPrice = parseCents(priceText);
  const priceCents = parsedPrice ?? 0;
  const distributed = rows.reduce((sum, row) => sum + row.percent, 0);
  const values = amounts(priceCents, rows);
  const edit = (next: Row[]) => {
    setSaved(false);
    setRows(next);
  };
  const update = (key: number, patch: Partial<Payment>) =>
    edit(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const applyPreset = (payments: Payment[]) =>
    edit(payments.map((payment) => ({ ...payment, key: nextKey.current++ })));

  async function save() {
    if (parsedPrice === undefined) {
      setErrors({ priceCents: "Informe um valor válido." });
      setProblem(undefined);
      setSaved(false);
      return;
    }
    setPending(true);
    const outcome = await savePayments(projectId, {
      priceCents: parsedPrice,
      payments: rows.map(({ kind, percent, trigger, due }) => ({ kind, percent, trigger, due })),
    });
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setProblem(outcome.kind === "ok" ? undefined : "Não foi possível salvar o plano de pagamento.");
    setSaved(outcome.kind === "ok");
  }

  return (
    <Section label="04 / Investimento e plano de pagamento">
      {loadFailed && (
        <Banner title="Não foi possível carregar o plano de pagamento." tone="danger" />
      )}
      {problem && (
        <Banner title={problem} tone="danger">
          Seus dados foram mantidos. Confira os campos e tente novamente.
        </Banner>
      )}
      {saved && <Banner title="Plano de pagamento salvo." tone="success" />}
      <div className="payment-head">
        <Field
          label="Valor total do projeto (R$)"
          value={priceText}
          error={errors.priceCents}
          disabled={readOnly}
          onChange={(text) => {
            setSaved(false);
            setPriceText(text.replace(/[^\d,]/g, ""));
          }}
        />
        {!readOnly && (
          <div className="payment-presets">
            <span className="field-label">Usar uma estrutura</span>
            <div>
              {Object.entries(presets).map(([name, payments]) => (
                <button type="button" key={name} onClick={() => applyPreset(payments)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="payment-progress">
        <div style={{ width: `${Math.min(distributed, 100)}%` }} />
      </div>
      <div className={`payment-balance ${distributed === 100 ? "balanced" : ""}`}>
        <strong>{distributed}% distribuído</strong>
        <span>
          {distributed === 100
            ? "Plano fechado"
            : distributed > 100
              ? `${distributed - 100}% acima do valor`
              : `Faltam ${100 - distributed}% para fechar o valor`}
        </span>
      </div>
      <div className="payment-list">
        {rows.map((row, index) => (
          <article className="payment-card" key={row.key}>
            <div className="payment-card-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{paymentKindLabels[row.kind]}</strong>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${paymentKindLabels[row.kind]}`}
                  onClick={() => edit(rows.filter((item) => item.key !== row.key))}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            <div className="payment-grid">
              <div className="field">
                <label htmlFor={`payment-kind-${row.key}`}>Tipo</label>
                <NativeSelect
                  id={`payment-kind-${row.key}`}
                  value={row.kind}
                  disabled={readOnly}
                  onChange={(e) => {
                    const kind = choose(paymentKindLabels, e.target.value);
                    if (kind) update(row.key, { kind });
                  }}
                >
                  {Object.entries(paymentKindLabels).map(([kind, label]) => (
                    <NativeSelectOption key={kind} value={kind}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="field">
                <label htmlFor={`payment-trigger-${row.key}`}>Quando cobrar</label>
                <NativeSelect
                  id={`payment-trigger-${row.key}`}
                  value={row.trigger}
                  disabled={readOnly}
                  onChange={(e) => {
                    const trigger = choose(paymentTriggerLabels, e.target.value);
                    if (trigger) update(row.key, { trigger });
                  }}
                >
                  {Object.entries(paymentTriggerLabels).map(([trigger, label]) => (
                    <NativeSelectOption key={trigger} value={trigger}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="payment-split">
              <div className="percent-control">
                <div>
                  <span>Percentual</span>
                  <strong>{row.percent}%</strong>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[row.percent]}
                  disabled={readOnly}
                  onValueChange={([percent]) => {
                    if (percent !== undefined) update(row.key, { percent });
                  }}
                  aria-label={`Percentual de ${paymentKindLabels[row.kind]}`}
                />
              </div>
              <div className="payment-value">
                <small>VALOR</small>
                <strong>{money.format((values[index] ?? 0) / 100)}</strong>
              </div>
            </div>
            <Field
              label="Data ou condição"
              value={row.due}
              disabled={readOnly}
              onChange={(due) => update(row.key, { due })}
              placeholder="Ex.: 5 dias após a aprovação"
            />
          </article>
        ))}
      </div>
      {!readOnly && (
        <Button
          variant="outline"
          disabled={rows.length >= maxRows}
          onClick={() =>
            edit([
              ...rows,
              { key: nextKey.current++, kind: "parcela", percent: 0, trigger: "etapa", due: "" },
            ])
          }
        >
          <Plus size={16} /> Adicionar pagamento
        </Button>
      )}
      {errors.payments && (
        <span className="field-error">
          <AlertCircle size={14} />
          {errors.payments}
        </span>
      )}
      {!readOnly && (
        <Button className="full" disabled={pending} onClick={save}>
          {pending ? "Salvando…" : "Salvar plano"}
        </Button>
      )}
      <p className="small payment-note">
        O PJ Suite organiza o combinado. A cobrança continua acontecendo diretamente entre você e o
        cliente.
      </p>
    </Section>
  );
}

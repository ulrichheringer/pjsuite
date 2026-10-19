import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import {
  getPayments,
  paymentKindLabels,
  paymentTriggerLabels,
  type Payment,
} from "@/api";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Banner, Button, Field } from "@/ui";

type Row = Payment & { key: number };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const centsText = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");

const parseCents = (text: string) => Math.round(Number(text.replace(",", ".")) * 100) || 0;

function amounts(priceCents: number, rows: Row[]) {
  const values = rows.map((row) => Math.floor((priceCents * row.percent) / 100));
  const total = rows.reduce((sum, row) => sum + row.percent, 0);
  const remainder =
    Math.floor((priceCents * total) / 100) - values.reduce((sum, value) => sum + value, 0);
  if (values.length > 0) values[values.length - 1]! += remainder;
  return values;
}

export function PaymentPlan({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const navigate = useNavigate();
  const nextKey = useRef(0);
  const [priceText, setPriceText] = useState("0");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    getPayments(projectId).then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setLoadFailed(true);
      setPriceText(centsText(outcome.value.priceCents));
      setRows(outcome.value.payments.map((payment) => ({ ...payment, key: nextKey.current++ })));
    });
  }, [projectId, navigate]);

  const priceCents = parseCents(priceText);
  const distributed = rows.reduce((sum, row) => sum + row.percent, 0);
  const values = amounts(priceCents, rows);
  const update = (key: number, patch: Partial<Payment>) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <section className="surface">
      <div className="row-between section-heading">
        <h2>04 / Investimento e plano de pagamento</h2>
      </div>
      {loadFailed && <Banner title="Não foi possível carregar o plano de pagamento." tone="danger" />}
      <div className="payment-head">
        <Field
          label="Valor total do projeto (R$)"
          value={priceText}
          disabled={readOnly}
          onChange={(text) => setPriceText(text.replace(/[^\d,]/g, ""))}
        />
      </div>
      <div className="payment-progress">
        <div style={{ width: `${Math.min(distributed, 100)}%` }} />
      </div>
      <div className={`payment-balance ${distributed === 100 ? "balanced" : ""}`}>
        <strong>{distributed}% distribuído</strong>
        <span>
          {distributed === 100 ? "Plano fechado" : `Faltam ${100 - distributed}% para fechar o valor`}
        </span>
      </div>
      <div className="payment-list">
        {rows.map((row, index) => (
          <article className="payment-card" key={row.key}>
            <div className="payment-card-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{paymentKindLabels[row.kind]}</strong>
              {!readOnly && rows.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${paymentKindLabels[row.kind]}`}
                  onClick={() => setRows(rows.filter((item) => item.key !== row.key))}
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
                  onChange={(e) => update(row.key, { kind: e.target.value as Payment["kind"] })}
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
                  onChange={(e) =>
                    update(row.key, { trigger: e.target.value as Payment["trigger"] })
                  }
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
                  onValueChange={([percent]) => update(row.key, { percent: percent! })}
                  aria-label={`Percentual de ${paymentKindLabels[row.kind]}`}
                />
              </div>
              <div className="payment-value">
                <small>VALOR</small>
                <strong>{money.format(values[index]! / 100)}</strong>
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
          onClick={() =>
            setRows([
              ...rows,
              { key: nextKey.current++, kind: "parcela", percent: 0, trigger: "etapa", due: "" },
            ])
          }
        >
          <Plus size={16} /> Adicionar pagamento
        </Button>
      )}
      <p className="small payment-note">
        O PJ Suite organiza o combinado. A cobrança continua acontecendo diretamente entre você e o
        cliente.
      </p>
    </section>
  );
}

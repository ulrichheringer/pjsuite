import { useId } from "react";
import { areas, type Client, type FieldErrors, type ProjectInput } from "@/api";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Choice, Field } from "@/ui";

export const emptyProject: ProjectInput = {
  clientId: 0,
  name: "",
  area: areas[0]!,
  reference: "",
  goal: "",
  structure: "essential",
};

const structures: { value: ProjectInput["structure"]; name: string; copy: (area: string) => string }[] = [
  { value: "blank", name: "Em branco", copy: () => "Você adiciona cada etapa do seu jeito." },
  { value: "essential", name: "Essencial", copy: () => "Briefing, execução, revisão e entrega." },
  {
    value: "suggested",
    name: "Estrutura sugerida",
    copy: (area) => `Uma base adaptada para ${area.toLowerCase()}.`,
  },
];

export function ProjectFields({
  value,
  errors,
  clients,
  chooseStructure = false,
  disabled = false,
  onChange,
}: {
  value: ProjectInput;
  errors: FieldErrors;
  clients: Pick<Client, "id" | "name">[];
  chooseStructure?: boolean;
  disabled?: boolean;
  onChange: (value: ProjectInput) => void;
}) {
  const clientId = useId();
  const set = <K extends keyof ProjectInput>(key: K) => (next: ProjectInput[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <>
      <div className="two-col">
        <Field
          label="Nome do projeto"
          value={value.name}
          onChange={set("name")}
          error={errors.name}
          disabled={disabled}
          required
        />
        <div className="field">
          <label htmlFor={clientId}>Cliente</label>
          <NativeSelect
            id={clientId}
            value={value.clientId}
            onChange={(e) => set("clientId")(Number(e.target.value))}
            aria-invalid={!!errors.client}
            disabled={disabled}
          >
            {clients.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.client && <span className="field-error">{errors.client}</span>}
        </div>
        <Choice label="Área do trabalho" options={areas} value={value.area} onChange={set("area")} />
        <Field
          label="Referência interna (opcional)"
          placeholder="Ex.: PJ-2026-024"
          value={value.reference}
          onChange={set("reference")}
          error={errors.reference}
          disabled={disabled}
        />
      </div>
      <Field
        label="Objetivo do projeto"
        value={value.goal}
        onChange={set("goal")}
        disabled={disabled}
        area
      />
      {chooseStructure && (
        <fieldset className="start-mode">
          <legend>Como você quer começar a montagem?</legend>
          <p>Isso só prepara a estrutura inicial. Tudo poderá ser alterado.</p>
          <div className="start-mode-grid">
            {structures.map((mode) => (
              <button
                type="button"
                key={mode.value}
                className={value.structure === mode.value ? "selected" : ""}
                onClick={() => set("structure")(mode.value)}
              >
                <span className="mode-radio" aria-hidden="true" />
                <strong>{mode.name}</strong>
                <small>{mode.copy(value.area)}</small>
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}

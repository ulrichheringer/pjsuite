import { useId } from "react";
import { areas, type Client, type FieldErrors, type ProjectInput } from "@/api";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Choice, Field } from "@/ui";

type ClientOption = Pick<Client, "id" | "name">;

export const emptyProject: ProjectInput = {
  clientId: 0,
  name: "",
  area: areas[0]!,
  reference: "",
  goal: "",
  structure: "essential",
};

const structures: {
  value: ProjectInput["structure"];
  name: string;
  copy: (area: string) => string;
}[] = [
  { value: "blank", name: "Em branco", copy: () => "Você adiciona cada etapa do seu jeito." },
  { value: "essential", name: "Essencial", copy: () => "Briefing, execução, revisão e entrega." },
  {
    value: "suggested",
    name: "Estrutura sugerida",
    copy: (area) => `Uma base adaptada para ${area.toLowerCase()}.`,
  },
];

export function ClientSelect({
  value,
  clients,
  error,
  disabled = false,
  onChange,
}: {
  value: number;
  clients: ClientOption[];
  error?: string;
  disabled?: boolean;
  onChange: (id: number) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>Cliente</label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-invalid={!!error}
        disabled={disabled}
      >
        {clients.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

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
  clients: ClientOption[];
  chooseStructure?: boolean;
  disabled?: boolean;
  onChange: (value: ProjectInput) => void;
}) {
  const set =
    <K extends keyof ProjectInput>(key: K) =>
    (next: ProjectInput[K]) =>
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
        <ClientSelect
          value={value.clientId}
          clients={clients}
          error={errors.client}
          disabled={disabled}
          onChange={set("clientId")}
        />
        <Choice
          label="Área do trabalho"
          options={areas}
          value={value.area}
          onChange={set("area")}
          disabled={disabled}
        />
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

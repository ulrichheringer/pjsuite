import type { ClientInput, FieldErrors } from "@/api";
import { Field } from "@/ui";

export const emptyClient: ClientInput = { name: "", email: "", phone: "", company: "", notes: "" };

export function ClientFields({
  value,
  errors,
  disabled = false,
  onChange,
}: {
  value: ClientInput;
  errors: FieldErrors;
  disabled?: boolean;
  onChange: (value: ClientInput) => void;
}) {
  const set = (key: keyof ClientInput) => (next: string) => onChange({ ...value, [key]: next });
  return (
    <>
      <div className="two-col">
        <Field
          label="Nome"
          value={value.name}
          onChange={set("name")}
          error={errors.name}
          disabled={disabled}
          required
        />
        <Field
          label="E-mail"
          type="email"
          value={value.email}
          onChange={set("email")}
          error={errors.email}
          disabled={disabled}
        />
        <Field label="Telefone" value={value.phone} onChange={set("phone")} disabled={disabled} />
        <Field
          label="Empresa"
          value={value.company}
          onChange={set("company")}
          disabled={disabled}
        />
      </div>
      <Field
        label="Observações internas"
        value={value.notes}
        onChange={set("notes")}
        disabled={disabled}
        area
      />
    </>
  );
}

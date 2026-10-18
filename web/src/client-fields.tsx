import type { ClientInput, FieldErrors } from "@/api";
import { Field } from "@/ui";

export const emptyClient: ClientInput = { name: "", email: "", phone: "", company: "", notes: "" };

export function ClientFields({
  value,
  errors,
  onChange,
}: {
  value: ClientInput;
  errors: FieldErrors;
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
          required
        />
        <Field
          label="E-mail"
          type="email"
          value={value.email}
          onChange={set("email")}
          error={errors.email}
        />
        <Field label="Telefone" value={value.phone} onChange={set("phone")} />
        <Field label="Empresa" value={value.company} onChange={set("company")} />
      </div>
      <Field label="Observações internas" value={value.notes} onChange={set("notes")} area />
    </>
  );
}

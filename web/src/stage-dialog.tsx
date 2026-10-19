import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  timingKindLabels,
  type FieldErrors,
  type Stage,
  type StageInput,
  type TimingKind,
} from "@/api";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Banner, Button, Field } from "@/ui";

export function StageDialog({
  stage,
  errors,
  problem,
  pending,
  onSave,
  onRemove,
  onClose,
}: {
  stage?: Stage;
  errors: FieldErrors;
  problem?: string;
  pending: boolean;
  onSave: (input: StageInput) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(stage?.name ?? "");
  const [timingKind, setTimingKind] = useState<TimingKind>(stage?.timingKind ?? "deadline");
  const [timing, setTiming] = useState(stage?.timing ?? "");
  const [tasks, setTasks] = useState(stage?.tasks.map((task) => task.title).join("\n") ?? "");
  const [deliverable, setDeliverable] = useState(stage?.deliverable ?? "");
  const [visible, setVisible] = useState(stage?.visible ?? true);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="phase-dialog">
        <DialogTitle>{stage ? "Configurar etapa" : "Adicionar etapa"}</DialogTitle>
        <DialogDescription>
          Use apenas o que fizer sentido para este projeto. Nenhum tipo de prazo é obrigatório.
        </DialogDescription>
        {problem && <Banner title={problem} tone="danger" />}
        <Field
          label="Nome da etapa"
          value={name}
          error={errors.name}
          onChange={setName}
          placeholder="Ex.: Desenvolvimento do MVP"
          required
        />
        <div className="two-col">
          <div className="field">
            <label htmlFor="stage-timing-kind">Como o prazo funciona?</label>
            <NativeSelect
              id="stage-timing-kind"
              value={timingKind}
              onChange={(e) => setTimingKind(e.target.value as TimingKind)}
            >
              {Object.entries(timingKindLabels).map(([kind, label]) => (
                <NativeSelectOption key={kind} value={kind}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errors.timingKind && <span className="field-error">{errors.timingKind}</span>}
          </div>
          <Field
            label="Prazo ou referência"
            value={timingKind === "none" ? "" : timing}
            error={errors.timing}
            onChange={setTiming}
            placeholder="Ex.: 10 dias após o kickoff"
            disabled={timingKind === "none"}
          />
        </div>
        <Field
          label="Tarefas — uma por linha"
          area
          value={tasks}
          error={errors.tasks}
          onChange={setTasks}
          placeholder={"Configurar ambiente\nImplementar fluxo principal\nRevisar com o cliente"}
        />
        <Field
          label="Entregável ou critério de conclusão"
          value={deliverable}
          error={errors.deliverable}
          onChange={setDeliverable}
          placeholder="Ex.: MVP disponível para homologação"
        />
        <div className="phase-visibility">
          <div>
            <strong>Visível para o cliente</strong>
            <small>Mostra esta etapa e seus marcos no link compartilhado.</small>
          </div>
          <Switch
            checked={visible}
            onCheckedChange={setVisible}
            aria-label="Visível para o cliente"
          />
        </div>
        <div className="dialog-actions">
          {stage && (
            <Button variant="ghost" className="danger-text" disabled={pending} onClick={onRemove}>
              <Trash2 size={16} /> Remover etapa
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSave({
                name,
                timingKind,
                timing: timingKind === "none" ? "" : timing,
                deliverable,
                visible,
                tasks: tasks
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          >
            {stage ? "Salvar etapa" : "Adicionar etapa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

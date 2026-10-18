"use client";
import { useId, type ReactNode } from "react";
import {
  Check,
  AlertCircle,
  Info,
  FileText,
  Download,
  Upload,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
export { Button };
export function Field({
  label,
  value,
  placeholder,
  type = "text",
  area = false,
  error,
  required = false,
  onChange,
  disabled = false,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  area?: boolean;
  error?: string;
  required?: boolean;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {area ? (
        <Textarea
          id={id}
          defaultValue={onChange ? undefined : value}
          value={onChange ? value : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          required={required}
          disabled={disabled}
        />
      ) : (
        <Input
          id={id}
          type={type}
          defaultValue={onChange ? undefined : value}
          value={onChange ? value : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          required={required}
          disabled={disabled}
        />
      )}{" "}
      {error && (
        <span className="field-error" id={id + "-error"}>
          <AlertCircle size={14} />
          {error}
        </span>
      )}
    </div>
  );
}
export function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Select value={value} defaultValue={value ? undefined : options[0]} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Badge({ children }: { children: string }) {
  const type = ["Assinado", "Concluído"].includes(children)
    ? "success"
    : ["Alteração solicitada", "Aguardando ajuste"].includes(children)
      ? "warning"
      : children === "Recusado"
        ? "danger"
        : ["Enviado", "Visto", "Em execução"].includes(children)
          ? "info"
          : "";
  return (
    <span className={`status ${type}`}>
      {type === "success" && <Check size={13} />} {children}
    </span>
  );
}
export function Banner({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`banner ${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {tone === "success" ? (
        <Check size={20} />
      ) : tone === "danger" || tone === "warning" ? (
        <AlertCircle size={20} />
      ) : (
        <Info size={20} />
      )}
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
export function Blank({
  title = "Tudo pronto para começar.",
  description = "Seu próximo projeto começa aqui.",
  action,
  onClick,
}: {
  title?: string;
  description?: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <Button onClick={onClick}>{action}</Button>}
    </Empty>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="Carregando conteúdo">
      <span>
        <Loader2 className="spin" size={18} /> Carregando seu projeto…
      </span>
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
export function Avatar({
  name = "Helena Duarte",
  size = "",
  src,
}: {
  name?: string;
  size?: string;
  src?: string;
}) {
  return (
    <span className={`avatar ${size}`} aria-label={name}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        name
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
      )}
    </span>
  );
}
export function FileRow({
  name = "Contrato — Clara e Miguel.pdf",
  meta = "PDF · 248 KB",
  onClick,
}: {
  name?: string;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <div className="file-row">
      <span className="file-icon">
        <FileText size={22} />
      </span>
      <div>
        <strong>{name}</strong>
        <small>{meta}</small>
      </div>
      {onClick && (
        <Button variant="ghost" size="icon" aria-label={`Abrir ${name}`} onClick={onClick}>
          <Download size={18} />
        </Button>
      )}
    </div>
  );
}
export function UploadBox({
  onFiles,
  title = "Escolher arquivos",
  hint = "PDF, JPG, PNG ou ZIP · até 20 MB por arquivo",
  accept = ".pdf,.jpg,.jpeg,.png,.zip",
  multiple = true,
}: {
  onFiles?: (files: File[]) => void;
  title?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="upload-box">
      <Upload size={24} />
      <strong>{title}</strong>
      <span>{hint}</span>
      <input
        id={id}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => onFiles?.(Array.from(e.target.files || []))}
      />
    </label>
  );
}
export function Timeline({
  compact = false,
  client = false,
  events,
}: {
  compact?: boolean;
  client?: boolean;
  events?: string[];
}) {
  const items = events || [
    "Projeto concluído · Clara Martins",
    "Entrega revisada aprovada · Clara Martins",
    "Entrega revisada publicada · Helena Duarte",
    "Ajuste solicitado: tons mais naturais · Clara Martins",
    "Primeira entrega publicada · Helena Duarte",
    "Contrato v2 assinado · Clara Martins",
    "Versão 2 compartilhada · Helena Duarte",
    "Alteração solicitada: início às 14h · Clara Martins",
    "Projeto visualizado · Clara Martins",
    ...(!client ? ["Projeto criado · Helena Duarte"] : []),
  ];
  return (
    <ol className="timeline">
      {items.slice(0, compact ? 4 : items.length).map((s, i) => (
        <li key={s}>
          <span className="timeline-node" />
          <div>
            <strong>{s.split(" · ")[0]}</strong>
            <p>
              {s.split(" · ")[1] || "Helena Duarte"}{" "}
              <span>
                · {i < 5 ? `${19 - i} nov` : `${27 - i} set`}, 2026 · 14:
                {String(32 - i).padStart(2, "0")}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`logo ${inverse ? "inverse" : ""}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <path
          d="M7 29V7h11a7 7 0 0 1 0 14h-5M29 7v16a6 6 0 0 1-6 6h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
        />
      </svg>
      <span>
        PJ <strong>Suite</strong>
      </span>
    </span>
  );
}

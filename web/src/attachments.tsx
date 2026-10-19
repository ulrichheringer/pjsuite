import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  attachmentExtensions,
  attachmentSizeError,
  attachmentTypeError,
  attachmentUrl,
  deleteAttachment,
  listAttachments,
  maxAttachmentBytes,
  uploadAttachment,
  type Attachment,
} from "@/api";
import { Banner, FileRow, Section, UploadBox } from "@/ui";

const typeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "application/zip": "ZIP",
};

const precheck = (file: File) => {
  const name = file.name.toLowerCase();
  if (!attachmentExtensions.some((extension) => name.endsWith(extension)))
    return attachmentTypeError;
  return file.size > maxAttachmentBytes ? attachmentSizeError : undefined;
};

export function Attachments({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [problem, setProblem] = useState<string>();

  const refresh = useCallback(async () => {
    const outcome = await listAttachments(projectId);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") return setLoadFailed(true);
    setLoadFailed(false);
    setFiles(outcome.value);
  }, [projectId, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function upload(chosen: File[]) {
    setProblem(undefined);
    for (const file of chosen) {
      const rejection = precheck(file);
      if (rejection) {
        setProblem(rejection);
        continue;
      }
      const outcome = await uploadAttachment(projectId, file);
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind === "invalid")
        setProblem(outcome.errors.file ?? `Não foi possível enviar ${file.name}.`);
      else if (outcome.kind === "failed")
        setProblem(
          outcome.status === 413 ? attachmentSizeError : `Não foi possível enviar ${file.name}.`,
        );
    }
    await refresh();
  }

  async function remove(file: Attachment) {
    setProblem(undefined);
    const outcome = await deleteAttachment(projectId, file.id);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    if (outcome.kind !== "ok") setProblem(`Não foi possível remover ${file.name}.`);
    await refresh();
  }

  return (
    <Section label="05 / Anexos">
      {loadFailed && <Banner title="Não foi possível carregar os anexos." tone="danger" />}
      {problem && <Banner title={problem} tone="danger" />}
      {!readOnly && <UploadBox onFiles={upload} />}
      {files.map((file) => {
        const size =
          file.size < 1024 * 1024
            ? `${Math.max(1, Math.round(file.size / 1024))} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
        return (
          <FileRow
            key={file.id}
            name={file.name}
            meta={`${typeLabels[file.contentType] ?? file.contentType} · ${size}`}
            href={attachmentUrl(projectId, file.id)}
            onRemove={readOnly ? undefined : () => remove(file)}
          />
        );
      })}
    </Section>
  );
}

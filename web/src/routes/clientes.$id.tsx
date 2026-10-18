import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getClient, updateClient, type ClientInput, type FieldErrors } from "@/api";
import { ClientFields } from "@/client-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Banner, Button, Loading } from "@/ui";

export const Route = createFileRoute("/clientes/$id")({ component: EditClientPage });

function EditClientPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<ClientInput>();
  const [form, setForm] = useState<ClientInput>();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const blocker = useBlocker({ shouldBlockFn: () => dirty, withResolver: true });

  useEffect(() => {
    getClient(id).then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind !== "ok") return setFailed(true);
      const { name, email, phone, company, notes } = outcome.value;
      const input = { name, email, phone, company, notes };
      setSaved(input);
      setForm(input);
    });
  }, [id, navigate]);

  if (!form) {
    return (
      <div className="product">
        <main className="pro-main">
          {failed ? (
            <Banner title="Não foi possível carregar o cliente." tone="danger">
              Tente novamente em instantes.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    const outcome = await updateClient(id, form);
    setPending(false);
    if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
    setErrors(outcome.kind === "invalid" ? outcome.errors : {});
    setFailed(outcome.kind === "failed");
    setConfirmed(outcome.kind === "ok");
    if (outcome.kind === "ok") setSaved(form);
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Editar cliente</h1>
            <p>Atualize o contato e a identificação deste cliente.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/clientes">
              <ArrowLeft />
              Voltar para clientes
            </Link>
          </Button>
        </header>
        {failed && (
          <Banner title="Não foi possível concluir." tone="danger">
            Seus dados foram mantidos. Confira os campos e tente novamente.
          </Banner>
        )}
        {confirmed && !dirty && <Banner title="Cliente salvo." tone="success" />}
        <form className="form-surface" onSubmit={submit} noValidate>
          <ClientFields
            value={form}
            errors={errors}
            onChange={(next) => {
              setConfirmed(false);
              setForm(next);
            }}
          />
          <div className="form-actions">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
        <AlertDialog open={blocker.status === "blocked"}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
              <AlertDialogDescription>
                As alterações feitas neste cliente serão perdidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={blocker.reset}>Continuar editando</AlertDialogCancel>
              <AlertDialogAction onClick={blocker.proceed}>Sair sem salvar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

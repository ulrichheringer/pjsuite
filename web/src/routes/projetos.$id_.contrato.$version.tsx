import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import { getContract, type Contract } from "@/api";
import { ContractPaper } from "@/contract-paper";
import { Banner, Button, Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/contrato/$version")({
  component: ContractPdfPage,
});

function ContractPdfPage() {
  const { id, version } = Route.useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getContract(id, Number(version)).then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind === "ok") return setContract(outcome.value);
      setFailed(true);
    });
  }, [id, version, navigate]);

  if (!contract) {
    return (
      <div className="product">
        <main className="pro-main">
          {failed ? (
            <Banner title="Não foi possível abrir o contrato." tone="danger">
              Confira se esta versão existe e tente novamente.
            </Banner>
          ) : (
            <Loading />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="product">
      <main className="pro-main">
        <header className="page-heading">
          <div>
            <span className="eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Contrato do projeto</h1>
            <p>
              Versão {contract.number} · {contract.content.professional.name} ·{" "}
              {contract.content.client.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Download />
              Imprimir / salvar PDF
            </Button>
            <Button asChild>
              <Link to="/projetos/$id/compartilhar" params={{ id }}>
                Compartilhar
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </header>
        <ContractPaper view={contract.content} version={contract.number} />
      </main>
    </div>
  );
}

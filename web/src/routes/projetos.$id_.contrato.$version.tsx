import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getContract, type Contract } from "@/api";
import { ContractPaper } from "@/contract-paper";
import { Loading } from "@/ui";

export const Route = createFileRoute("/projetos/$id_/contrato/$version")({
  component: ContractPdfPage,
});

function ContractPdfPage() {
  const { id, version } = Route.useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract>();

  useEffect(() => {
    getContract(id, Number(version)).then((outcome) => {
      if (outcome.kind === "unauthorized") return navigate({ to: "/entrar" });
      if (outcome.kind === "ok") setContract(outcome.value);
    });
  }, [id, version, navigate]);

  return (
    <div className="product">
      <main className="pro-main">
        {contract ? (
          <ContractPaper view={contract.content} version={contract.number} />
        ) : (
          <Loading />
        )}
      </main>
    </div>
  );
}

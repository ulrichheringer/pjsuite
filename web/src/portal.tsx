import { useEffect, useState, type ReactNode } from "react";
import { getPortal, type Portal } from "@/api";
import { Banner, Blank, Loading } from "@/ui";

type PortalState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "failed" }
  | { kind: "ok"; portal: Portal };

export function PortalPage({
  token,
  children,
}: {
  token: string;
  children: (portal: Portal) => ReactNode;
}) {
  const [state, setState] = useState<PortalState>({ kind: "loading" });

  useEffect(() => {
    getPortal(token).then((outcome) => {
      if (outcome.kind === "ok") return setState({ kind: "ok", portal: outcome.value });
      setState({
        kind: outcome.kind === "failed" && outcome.status === 404 ? "invalid" : "failed",
      });
    });
  }, [token]);

  return (
    <div className="product">
      <main className="pro-main">
        {state.kind === "loading" && <Loading />}
        {state.kind === "invalid" && (
          <Blank
            title="Link inválido"
            description="Este link não está disponível. Peça um novo link a quem enviou o projeto."
          />
        )}
        {state.kind === "failed" && (
          <Banner title="Não foi possível abrir o projeto." tone="danger">
            Tente novamente em instantes.
          </Banner>
        )}
        {state.kind === "ok" && children(state.portal)}
      </main>
    </div>
  );
}

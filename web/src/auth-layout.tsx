import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/ui";

export function AuthLayout({
  title,
  subtitle,
  switchText,
  switchLabel,
  switchTo,
  children,
}: {
  title: string;
  subtitle: string;
  switchText: string;
  switchLabel: string;
  switchTo: "/entrar" | "/cadastro";
  children: ReactNode;
}) {
  return (
    <div className="product">
      <div className="auth-layout">
        <aside className="auth-editorial">
          <Logo inverse />
          <div>
            <span className="eyebrow">DO ACORDO À ENTREGA</span>
            <h1>
              Mais espaço
              <br />
              para o seu
              <br />
              <em>melhor trabalho.</em>
            </h1>
            <p>
              Projetos bem combinados.
              <br />
              Relações bem cuidadas.
            </p>
          </div>
          <small>PJ Suite · Feito para quem cria.</small>
        </aside>
        <div className="auth-form">
          <Logo />
          <span className="eyebrow">SEU ESPAÇO DE TRABALHO</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
          <p className="auth-switch">
            {switchText} <Link to={switchTo}>{switchLabel}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

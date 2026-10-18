"use client";
import { useEffect, useState } from "react";
import {
  Monitor,
  Smartphone,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Info,
  List,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button, Choice } from "./ui";
import { Logo, Identity } from "./identity";
import { Components, Storyboard, Tokens } from "./boards";
import Product from "./product";
import { screens } from "./catalog";
export default function Studio() {
  const [area, setArea] = useState("identity");
  const [screen, setScreen] = useState("projects");
  const [state, setState] = useState("Padrão");
  const [device, setDevice] = useState("desktop");
  const [embed, setEmbed] = useState(false);
  const [ready, setReady] = useState(false);
  const [list, setList] = useState(false);
  const [current, setCurrent] = useState("projects");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("screen");
    if (s && screens.some((x) => x.id === s)) {
      setScreen(s);
      setCurrent(s);
      setArea("screens");
    }
    setEmbed(p.get("embed") === "1");
    setState(p.get("state") || "Padrão");
    setReady(true);
  }, []);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (
        e.origin === window.location.origin &&
        e.data?.type === "pj-screen" &&
        screens.some((s) => s.id === e.data.id)
      ) {
        setCurrent(e.data.id);
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  const open = (id: string) => {
    setScreen(id);
    setCurrent(id);
    setState("Padrão");
    setArea("screens");
    setList(false);
  };
  const meta = screens.find((s) => s.id === current) || screens[7];
  const groups = Array.from(new Set(screens.map((s) => s.group)));
  if (!ready)
    return (
      <div className="studio-loading">
        <Logo />
        <span>Preparando a apresentação…</span>
      </div>
    );
  if (embed)
    return (
      <>
        <Product
          initialScreen={screen}
          preset={state}
          onNavigate={(id) => {
            window.parent.postMessage(
              { type: "pj-screen", id },
              window.location.origin,
            );
          }}
        />
        <Toaster theme="light" position="bottom-right" />
      </>
    );
  return (
    <>
      <header className="studio-header">
        <Logo />
        <span className="studio-title">
          DESIGN DE PRODUTO <span>/</span> EDIÇÃO 01
        </span>
        <span className="small">
          Identidade & experiência <span className="edition-dot" /> 2026
        </span>
      </header>
      <nav className="studio-nav" aria-label="Camadas da entrega">
        {[
          ["identity", "A. Identidade"],
          ["components", "B. Componentes"],
          ["screens", "C. Telas"],
          ["story", "Storyboard"],
          ["tokens", "Tokens & specs"],
        ].map(([v, t]) => (
          <button
            key={v}
            className={area === v ? "active" : ""}
            onClick={() => setArea(v)}
          >
            {t}
          </button>
        ))}
      </nav>
      {area === "identity" ? (
        <Identity />
      ) : area === "components" ? (
        <Components />
      ) : area === "story" ? (
        <Storyboard open={open} />
      ) : area === "tokens" ? (
        <Tokens />
      ) : (
        <div className="catalog">
          <div className="catalog-bar">
            <button className="catalog-toggle" onClick={() => setList(!list)}>
              <List size={18} />
              <span>34 telas</span>
            </button>
            <div className="catalog-title">
              <span>{meta.group}</span>
              <strong>{meta.name}</strong>
            </div>
            <div
              className="device-toggle"
              role="group"
              aria-label="Largura da tela"
            >
              <button
                aria-pressed={device === "desktop"}
                onClick={() => {
                  setScreen(current);
                  setDevice("desktop");
                }}
              >
                <Monitor size={17} />
                <span>Desktop</span>
              </button>
              <button
                aria-pressed={device === "mobile"}
                onClick={() => {
                  setScreen(current);
                  setDevice("mobile");
                }}
              >
                <Smartphone size={17} />
                <span>Mobile · 390</span>
              </button>
            </div>
            <div className="state-select">
              <Choice
                label="Estado"
                options={meta.states}
                value={state}
                key={current + state}
                onChange={(s) => {
                  setScreen(current);
                  setState(s);
                }}
              />
            </div>
            <a
              className="open-screen"
              href={`/?screen=${current}&embed=1&state=${encodeURIComponent(state)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir tela em tamanho real"
            >
              <ExternalLink size={18} />
            </a>
          </div>
          <div className="catalog-layout">
            <aside className={`screen-rail ${list ? "expanded" : ""}`}>
              <span className="eyebrow">TELAS DO PRODUTO</span>
              {groups.map((g) => (
                <div key={g}>
                  <h3>{g}</h3>
                  {screens
                    .filter((s) => s.group === g)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => open(s.id)}
                        className={current === s.id ? "active" : ""}
                      >
                        <span>{s.name.split(" · ")[0]}</span>
                        {s.name.split(" · ")[1]}
                      </button>
                    ))}
                </div>
              ))}
            </aside>
            <main className="catalog-main">
              <div className={`screen-workspace ${device}`}>
                <div className="viewport-label">
                  <span>
                    {device === "mobile"
                      ? "MOBILE / 390 PX"
                      : "DESKTOP / RESPONSIVO"}
                  </span>
                  <span>Protótipo interativo · dados fictícios</span>
                </div>
                <iframe
                  key={screen + state + device}
                  title={`PJ Suite — ${meta.name} — ${device}`}
                  src={`/?screen=${screen}&embed=1&state=${encodeURIComponent(state)}`}
                  className="product-frame"
                />
              </div>
              <section className="screen-spec">
                <div>
                  <span className="eyebrow">PROPÓSITO</span>
                  <p>{meta.purpose}</p>
                </div>
                <div>
                  <span className="eyebrow">COMPONENTES</span>
                  <p>{meta.components}</p>
                </div>
                <div>
                  <span className="eyebrow">FORA DESTA TELA</span>
                  <p>{meta.excludes}</p>
                </div>
                <div className="spec-next">
                  <Button
                    variant="outline"
                    onClick={() =>
                      open(
                        screens[
                          Math.max(
                            0,
                            screens.findIndex((s) => s.id === current) - 1,
                          )
                        ].id,
                      )
                    }
                    aria-label="Tela anterior"
                  >
                    <ArrowLeft />
                  </Button>
                  {meta.next && (
                    <Button onClick={() => open(meta.next!)}>
                      Próximo passo
                      <ArrowRight />
                    </Button>
                  )}
                </div>
              </section>
              <div className="catalog-footnote">
                <Info size={14} />
                Todas as telas usam o mesmo código responsivo. Troque para
                Mobile para inspecionar a variação de cada tela.
              </div>
            </main>
          </div>
        </div>
      )}
      <footer className="studio-footer">
        <Logo />
        <span>Clareza para combinar. Tranquilidade para criar.</span>
        <small>PJ Suite / Design system v1.0</small>
      </footer>
      <Toaster theme="light" position="bottom-right" />
    </>
  );
}

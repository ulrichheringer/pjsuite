"use client";
import {
  ArrowUpRight,
  Check,
  X,
  Aperture,
  FileText,
  Paperclip,
} from "lucide-react";
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
export function Identity() {
  return (
    <div className="identity board">
      <div className="section-label">
        A / IDENTIDADE VISUAL <span>01 — FUNDAMENTOS</span>
      </div>
      <section className="brand-hero">
        <div>
          <span className="eyebrow">DO PRIMEIRO ACORDO À ÚLTIMA ENTREGA.</span>
          <h1>
            Seu trabalho tem valor.
            <br />
            <em>Dê forma a ele.</em>
          </h1>
          <p>
            Clareza para combinar.
            <br />
            Tranquilidade para criar.
          </p>
          <div className="brand-signature">
            <Logo />
            <span>Identidade de produto · 2026</span>
          </div>
        </div>
        <div className="brand-composition">
          <div className="mini-project">
            <div className="row-between">
              <span className="eyebrow">PROJETO / 024</span>
              <ArrowUpRight size={20} />
            </div>
            <h2>
              O dia deles.
              <br />O seu olhar.
            </h2>
            <p>Casamento · Clara & Miguel</p>
            <div className="mini-rule" />
            <div className="row-between">
              <span className="status success">
                <Check size={13} /> Assinado
              </span>
              <span className="small">12 out, 2026</span>
            </div>
          </div>
          <div className="brand-seal">
            <Logo inverse />
            <span>COMBINADO. REGISTRADO. ENTREGUE.</span>
          </div>
          <span className="composition-caption">
            Uma marca para o trabalho que leva a sua assinatura.
          </span>
        </div>
      </section>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">01 / A MARCA</div>
          <div className="logo-pair">
            <div>
              <Logo />
              <small>Principal · sobre papel</small>
            </div>
            <div className="ink">
              <Logo inverse />
              <small>Invertida · sobre tinta</small>
            </div>
          </div>
          <p>
            Um monograma aberto: duas iniciais, um mesmo acordo. O traço
            contínuo conecta projeto e entrega. Proteção: ½ da altura do
            símbolo. Mínimo: 96 px com nome, 24 px isolado.
          </p>
        </section>
        <section className="panel type-board">
          <div className="section-label">02 / TIPOGRAFIA</div>
          <h2>
            Trabalho autoral.
            <br />
            <em>Gestão com clareza.</em>
          </h2>
          <div className="row-between">
            <span>
              DM Serif Display <small>Display · 400</small>
            </span>
            <span>
              Manrope <small>Interface · 400–700</small>
            </span>
          </div>
        </section>
      </div>
      <section className="panel palette-board">
        <div className="row-between">
          <div className="section-label">03 / PALETA</div>
          <span className="small">Tinta + papel + cobre. Cor com função.</span>
        </div>
        <div className="swatches">
          {[
            ["Tinta", "#263D52", "Primária"],
            ["Papel", "#F7F8FA", "Fundo"],
            ["Branco", "#FFFFFF", "Superfície"],
            ["Grafite", "#202C36", "Texto"],
            ["Cobre", "#995033", "Acento"],
            ["Musgo", "#28654B", "Sucesso"],
            ["Âmbar", "#815B16", "Alerta"],
            ["Vinho", "#A13842", "Erro"],
          ].map(([n, c, r]) => (
            <div className="swatch" key={n}>
              <div style={{ background: c }} />
              <strong>{n}</strong>
              <code>{c}</code>
              <small>{r}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">04 / CINCO PRINCÍPIOS</div>
          {[
            "O trabalho é protagonista.",
            "O próximo passo é sempre claro.",
            "Um acordo não muda em silêncio.",
            "Cada pessoa vê o que precisa.",
            "Calma na forma. Precisão na função.",
          ].map((s, i) => (
            <div className="principle" key={s}>
              <span>0{i + 1}</span>
              <h3>{s}</h3>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="section-label">05 / DIREÇÃO VISUAL</div>
          <div className="do-example">
            <Check />
            <div>
              <strong>Dar espaço ao que importa.</strong>
              <p>
                Um título editorial, um CTA principal, status escrito e bordas
                discretas.
              </p>
              <span className="status success">✓ Assinado</span>
            </div>
          </div>
          <div className="dont-example">
            <X />
            <div>
              <strong>Não copiar a referência.</strong>
              <p>
                Sem verde neon, gradientes luminosos, grids clonados ou excesso
                de etiquetas. Sem cor como único sinal.
              </p>
              <span className="bad-chip">URGENTE!!!</span>
            </div>
          </div>
          <p>
            Light mode intencional: projeto, contrato e PDF mantêm a mesma
            referência de papel. A marca invertida é uma aplicação de
            identidade, não um tema escuro.
          </p>
        </section>
      </div>
      <div className="brand-grid three">
        <section className="panel">
          <div className="section-label">06 / RITMO</div>
          <h3>4 · 8 · 12 · 16 · 24 · 32 · 48</h3>
          <p>
            Desktop: 12 colunas, gutter 24, margem 40. Mobile: 4 colunas, gutter
            16, margem 20.
          </p>
          <div className="spacing-demo">
            {[8, 16, 24, 32, 48].map((n) => (
              <i key={n} style={{ width: n, height: n }} />
            ))}
          </div>
          <p>
            Radius 8 / 12 / 20 px. Borda 1 px #D8DEE5. Elevação só em
            sobreposição.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">07 / ÍCONES E ARQUIVOS</div>
          <div className="icon-demo">
            <Aperture />
            <FileText />
            <Paperclip />
            <ArrowUpRight />
          </div>
          <p>
            Lucide, traço 1,75. 16 px inline, 20 px em navegação, 24 px em
            destaque. Ações com rótulo acessível.
          </p>
          <p>
            Fotos preservam proporção; PDF em folha branca. Anexos mostram nome,
            tipo, tamanho e ação. Sem galeria pesada.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">08 / COMPORTAMENTO</div>
          <p>
            Foco visível de 3 px. Alvos de toque de 44 px. Transições de 160 ms,
            respeitando movimento reduzido.
          </p>
          <p>
            Vazio orienta. Loading preserva estrutura. Erro oferece saída.
            Sucesso confirma a ação. Desabilitado explica a dependência.
          </p>
          <span className="status success">
            <Check size={14} /> Alterações salvas
          </span>
        </section>
      </div>
    </div>
  );
}

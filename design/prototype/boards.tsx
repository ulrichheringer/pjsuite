"use client";
import { useState } from "react";
import {
  Check,
  Loader2,
  Eye,
  Copy,
  Plus,
  ArrowRight,
  Folder,
  Users,
  Bell,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { statuses, colorTokens, screens, storyboard } from "./catalog";
import {
  Button,
  Field,
  Choice,
  Badge,
  Banner,
  Blank,
  Loading,
  Avatar,
  FileRow,
  UploadBox,
  Timeline,
} from "./ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
export function Components() {
  const [vis, setVis] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  return (
    <div className="board components-board">
      <div className="section-label">
        B / SISTEMA DE COMPONENTES <span>INTERAÇÕES REAIS · REACT</span>
      </div>
      <div className="board-intro">
        <h1>
          Uma linguagem.
          <br />
          <em>Cada detalhe importa.</em>
        </h1>
        <p>
          Componentes compartilhados pelos dois mundos.
          <br />
          Explore os controles com mouse, toque e teclado.
        </p>
      </div>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">01 / AÇÕES</div>
          <div className="component-line">
            <Button onClick={() => toast.success("Projeto salvo.")}>
              Salvar projeto
              <Check />
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Edição cancelada.")}
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast.info("Detalhes do projeto abertos.")}
            >
              Ver detalhes
              <ArrowRight />
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                toast.error(
                  "Exemplo de ação destrutiva. Nenhum projeto foi recusado.",
                )
              }
            >
              Recusar
            </Button>
          </div>
          <div className="component-line">
            <Button disabled>
              <Loader2 className="spin" />
              Salvando…
            </Button>
            <Button disabled>Assinar contrato</Button>
          </div>
          <p>
            Primário: uma ação por contexto. Secundário: alternativa. Ghost:
            navegação. Destrutivo: recusa com confirmação. Disabled: depende de
            concordância.
          </p>
          <div className="state-specimens">
            <span>Default</span>
            <span className="hover-sample">Hover</span>
            <span className="focus-sample">Focus</span>
            <span className="disabled-sample">Disabled</span>
          </div>
        </section>
        <section className="panel">
          <div className="section-label">02 / STATUS DO PRODUTO</div>
          <div className="component-line">
            {statuses.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          <p>
            O texto é obrigatório. Cores agrupam significados e não substituem
            nomes. “Visto” é um evento de visualização; “Em execução” começa
            depois da assinatura.
          </p>
        </section>
      </div>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">03 / CAMPOS E VALIDAÇÃO</div>
          <Field label="Nome do projeto" value="Casamento Clara & Miguel" />
          <Field
            label="E-mail do cliente"
            value="clara@"
            error="Informe um e-mail completo, como clara@exemplo.com."
          />
          <Field
            label="Contrato assinado"
            value="Versão 2 · somente leitura"
            disabled
          />
          <Field
            label="Escopo"
            area
            value="Oito horas de cobertura, dois fotógrafos e 400 fotografias tratadas."
          />
          <div className="two-col">
            <Field label="Data do evento" type="date" value="2026-10-12" />
            <Field label="Preço (R$)" value="6.800,00" />
          </div>
          <Choice
            label="Cliente"
            options={["Clara Martins", "Marina Costa", "Ateliê Aurora"]}
          />
          <p>
            Labels permanentes; erro junto do campo. Tab percorre os controles;
            foco permanece visível.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">04 / ESCOLHAS E NAVEGAÇÃO</div>
          <label className="check-label">
            <Checkbox defaultChecked />
            Li e concordo com o contrato v2.
          </label>
          <label className="check-label">
            <Checkbox />
            Quero aprovar a entrega final.
          </label>
          <label className="check-label">
            <Checkbox disabled />
            Concordância indisponível nesta versão.
          </label>
          <div className="switch-row">
            <label htmlFor="component-visibility">
              <strong>Anexos do projeto</strong>
              <small>
                {vis ? "Visíveis para o cliente" : "Só o profissional vê"}
              </small>
            </label>
            <Switch
              id="component-visibility"
              checked={vis}
              onCheckedChange={setVis}
            />
          </div>
          <div className="tabs-demo">
            <Tabs defaultValue="Projetos">
              <TabsList variant="line">
                <TabsTrigger value="Projetos">Projetos</TabsTrigger>
                <TabsTrigger value="Arquivados">Arquivados</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <nav className="demo-breadcrumb" aria-label="Exemplo de caminho">
            Projetos <span>/</span> Clara & Miguel <span>/</span> Contrato
          </nav>
          <div className="demo-nav">
            <span className="selected">
              <Folder size={18} />
              Projetos
            </span>
            <span>
              <Users size={18} />
              Clientes
            </span>
            <span>
              <Bell size={18} />
              Avisos
            </span>
          </div>
          <p>
            Sidebar no desktop; menu em drawer no mobile. Mesmo vocabulário e
            mesma ordem.
          </p>
        </section>
      </div>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">05 / FEEDBACK</div>
          <Banner title="Alterações salvas." tone="success">
            A nova versão está disponível para revisão.
          </Banner>
          <Banner title="O cliente pediu uma alteração." tone="warning">
            Confira o pedido antes de reenviar o contrato.
          </Banner>
          <Banner title="Não foi possível salvar." tone="danger">
            Seu texto foi mantido. Tente novamente.
          </Banner>
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Link copiado. Pronto para compartilhar.")
            }
          >
            Testar toast
            <Copy />
          </Button>
          <p>
            Toast confirma ações simples; banners persistem quando há uma
            decisão pendente.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">06 / SOBREPOSIÇÕES</div>
          <div className="component-line">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Abrir modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Publicar esta entrega?</DialogTitle>
                <DialogDescription>
                  Os arquivos ficarão disponíveis para o cliente no link do
                  projeto.
                </DialogDescription>
                <FileRow name="Fotografias finais.zip" meta="ZIP · entrega 1" />
                <Button
                  onClick={() => toast.success("Exemplo de entrega publicada.")}
                >
                  Publicar entrega
                  <Check />
                </Button>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Abrir drawer</Button>
              </SheetTrigger>
              <SheetContent>
                <div className="drawer-demo">
                  <SheetTitle>Detalhes do cliente</SheetTitle>
                  <SheetDescription>
                    Informações usadas neste projeto.
                  </SheetDescription>
                  <Avatar name="Clara Martins" size="large" />
                  <h3>Clara Martins</h3>
                  <p>clara.martins@example.com</p>
                  <Field label="Telefone" value="(31) 98800-0156" />
                  <Button
                    onClick={() =>
                      toast.success("Contato salvo nesta demonstração.")
                    }
                  >
                    Salvar contato
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="overlay-spec">
            <div>
              <span className="eyebrow">CONFIRMAÇÃO</span>
              <h3>Arquivar este projeto?</h3>
              <p>O histórico permanece disponível.</p>
              <div className="component-line">
                <Button variant="outline" disabled>
                  Manter ativo
                </Button>
                <Button disabled>Arquivar</Button>
              </div>
            </div>
          </div>
          <p>
            Focus trap, Escape fecha, foco retorna ao acionador. Modal até 512
            px; drawer até 420 px. No mobile, margem de 16 px.
          </p>
        </section>
      </div>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">07 / ARQUIVOS E ANEXOS</div>
          <UploadBox
            onFiles={(f) => {
              const valid = f.filter((x) => x.size <= 20 * 1024 * 1024);
              setFiles([...files, ...valid.map((x) => x.name)]);
              if (valid.length !== f.length)
                toast.error("Limite de 20 MB por arquivo.");
            }}
          />
          {files.map((f, i) => (
            <FileRow key={f + i} name={f} meta="Selecionado · demonstração" />
          ))}
          <FileRow
            onClick={() =>
              toast.info("Confira o contrato completo na tela 16 do catálogo.")
            }
          />
          <div className="pdf-mini">
            <FileText size={30} />
            <h3>Casamento Clara & Miguel</h3>
            <p>
              Contrato de prestação de serviços
              <br />
              Versão 2 · 22 set, 2026
            </p>
            <span>Documento · leitura confortável · fundo branco</span>
          </div>
          <p>
            PDF nunca recebe filtros de cor. Fotos mantêm proporção; miniaturas
            de recorte são opcionais. Ícone, nome e tamanho funcionam mesmo sem
            thumbnail.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">08 / PERFIL E COMPARTILHAMENTO</div>
          <div className="profile-banner">
            <Avatar size="large" />
            <div>
              <h3>Helena Duarte</h3>
              <p>Fotografia afetiva · Belo Horizonte</p>
            </div>
          </div>
          <div className="link-spec">
            <LinkIllustration />
            <strong>Projeto pronto para compartilhar</strong>
            <code>pj-suite.exemplo/p/clara-miguel</code>
            <Button
              variant="outline"
              onClick={() =>
                toast.info(
                  "Exemplo visual de link. Gere o link navegável na tela Compartilhar.",
                )
              }
            >
              <Copy />
              Copiar link
            </Button>
            <small>
              <Eye size={14} />
              Cliente visualizou · hoje, 14h32
            </small>
          </div>
          <p>
            Avatares usam iniciais quando não há foto. O link pode ser copiado
            sem abrir a visão do cliente.
          </p>
        </section>
      </div>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">09 / HISTÓRICO</div>
          <Timeline compact />
          <p>
            Eventos com autor, data e versão. Ordenação do mais recente para o
            mais antigo. Cliente vê só o histórico compartilhado.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">10 / VAZIO E CARREGAMENTO</div>
          <Blank
            title="Seu primeiro projeto começa aqui."
            description="Reúna escopo, contrato e entregas em um só lugar."
            action="Criar projeto"
            onClick={() =>
              toast.info(
                "Abra a tela 09 no catálogo para experimentar o fluxo.",
              )
            }
          />
          <Loading />
        </section>
      </div>
      <section className="panel">
        <div className="section-label">11 / LISTA E CARD</div>
        <div className="brand-grid">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="person">
                    <Avatar name="Clara Martins" />
                    Clara Martins
                  </div>
                </TableCell>
                <TableCell>Casamento</TableCell>
                <TableCell>
                  <Badge>Assinado</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <article className="project-card">
            <span className="eyebrow">FOTOGRAFIA DE CASAMENTO</span>
            <h3 className="project-title">Casamento Clara & Miguel</h3>
            <p>Clara Martins</p>
            <Badge>Em execução</Badge>
            <footer>
              <span>12 out, 2026</span>
              <strong>R$ 6.800,00</strong>
            </footer>
          </article>
        </div>
      </section>
    </div>
  );
}
function LinkIllustration() {
  return <Copy size={24} />;
}
export function Storyboard({ open }: { open: (s: string) => void }) {
  return (
    <div className="board">
      <div className="section-label">
        C / FLUXO ANOTADO <span>UMA HISTÓRIA COMPLETA</span>
      </div>
      <div className="board-intro">
        <h1>
          Helena cria.
          <br />
          <em>Clara acompanha.</em>
        </h1>
        <p>
          Um casamento, duas perspectivas.
          <br />
          Do cadastro à aprovação da última entrega.
        </p>
      </div>
      <div className="storyboard">
        {storyboard.map(([n, t, d, s]) => (
          <button key={n} onClick={() => open(s)} className="story-card">
            <span className="story-number">{n}</span>
            <div>
              <span className="eyebrow">
                {s.startsWith("client-") && !s.includes("new")
                  ? "CLIENTE · LINK"
                  : "PROFISSIONAL · APP"}
              </span>
              <h2>{t}</h2>
              <p>{d}</p>
            </div>
            <ArrowRight size={20} />
          </button>
        ))}
      </div>
      <section className="panel flow-detail">
        <div className="section-label">10 / EXECUÇÃO EM DETALHE</div>
        <div className="flow-steps">
          {[
            ["Execução", "execution"],
            ["Publicar entrega", "delivery"],
            ["Cliente revisa", "client-delivery"],
            ["Pede ajuste", "client-adjust"],
            ["Profissional revisa", "adjustment"],
            ["Cliente aprova", "client-approve"],
            ["Projeto concluído", "complete"],
          ].map(([t, s], i) => (
            <button onClick={() => open(s)} key={s}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {t}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>
      <div className="brand-grid">
        <section className="panel">
          <h3>Caminho alternativo: recusa</h3>
          <p>
            Revisão → recusar → confirmar → recibo de recusa → histórico. Não há
            contrato assinado nem início de execução.
          </p>
          <Button variant="outline" onClick={() => open("client-refuse")}>
            Ver recusa
            <ArrowRight />
          </Button>
        </section>
        <section className="panel">
          <h3>Acordo e execução são registros diferentes.</h3>
          <p>
            Pedidos comerciais geram nova versão do contrato. Atualizar uma
            tarefa ou publicar uma entrega não reescreve o acordo assinado.
          </p>
          <Button variant="outline" onClick={() => open("revision")}>
            Ver revisão de versão
            <ArrowRight />
          </Button>
        </section>
      </div>
    </div>
  );
}
export function Tokens() {
  return (
    <div className="board tokens-board">
      <div className="section-label">
        D / HANDOFF PARA ENGENHARIA <span>CSS + REACT</span>
      </div>
      <div className="board-intro">
        <h1>
          Da intenção
          <br />
          <em>à implementação.</em>
        </h1>
        <p>
          Tokens semânticos, regras responsivas
          <br />e o contrato visual de cada tela.
        </p>
      </div>
      <section className="panel">
        <div className="section-label">ARQUIVOS PARA ENGENHARIA</div>
        <div className="component-line">
          <Button variant="outline" asChild><a href="/tokens.json" download>Tokens JSON<Download /></a></Button>
          <Button variant="outline" asChild><a href="/brand/wordmark-light.svg" download>Marca principal SVG<Download /></a></Button>
          <Button variant="outline" asChild><a href="/brand/wordmark-dark.svg" download>Marca invertida SVG<Download /></a></Button>
          <Button variant="outline" asChild><a href="/brand/monogram.svg" download>Monograma SVG<Download /></a></Button>
        </div>
        <div className="section-label">CORES / LIGHT MODE</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Uso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colorTokens.map(([n, c, u]) => (
              <TableRow key={n}>
                <TableCell>
                  <code>--{n}</code>
                </TableCell>
                <TableCell>
                  <span className="token-dot" style={{ background: c }} />
                  {c}
                </TableCell>
                <TableCell>{u}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <div className="brand-grid">
        <section className="panel">
          <div className="section-label">TIPOGRAFIA</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Papel</TableHead>
                <TableHead>Desktop / mobile</TableHead>
                <TableHead>Entrelinha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Display", "60 / 40", "1.1"],
                ["Título editorial", "48 / 38", "1.12"],
                ["Título de página", "38 / 32", "1.1"],
                ["Título de seção", "18 / 18", "1.4"],
                ["Corpo", "16 / 16", "1.6"],
                ["UI / controles", "14 / 16", "1.5"],
                ["Metadados", "12 / 12", "1.5"],
              ].map((r) => (
                <TableRow key={r[0]}>
                  {r.map((v) => (
                    <TableCell key={v}>{v}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>
            DM Serif Display 400 para títulos editoriais. Manrope
            400/500/600/700 para UI. Fontes Google Fonts, licença aberta.
            Fallback: Georgia / Arial.
          </p>
        </section>
        <section className="panel">
          <div className="section-label">GEOMETRIA E MOVIMENTO</div>
          <Table>
            <TableBody>
              {[
                ["Espaçamento", "4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px"],
                ["Radius", "4 status / 8 controles / 12 cards / 20 destaque"],
                ["Borda", "1 px sólida"],
                ["Sombra overlay", "0 16px 48px #263D521A"],
                ["Foco", "3 px #537895, offset 3 px"],
                ["Transição", "160 ms ease"],
                ["Toque", "44 × 44 px mínimo"],
                ["Desktop", "≥ 1024 px, sidebar 224 px"],
                ["Tablet", "768–1023 px, colunas simplificadas"],
                ["Mobile", "< 768 px, uma coluna + drawer"],
                ["Área útil", "Máximo 1400 px app / 1120 px cliente"],
              ].map(([a, b]) => (
                <TableRow key={a}>
                  <TableCell>{a}</TableCell>
                  <TableCell>{b}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
      <section className="panel">
        <div className="section-label">CONTRATO DE INTERAÇÃO</div>
        <div className="brand-grid three">
          <div>
            <h3>Teclado e foco</h3>
            <p>
              Tab respeita a ordem visual. Enter envia formulários. Escape fecha
              modal/drawer. Navegação ativa tem texto e forma. Inputs mantêm
              labels.
            </p>
          </div>
          <div>
            <h3>Adaptação mobile</h3>
            <p>
              Tabelas viram cartões, colunas se empilham e ações ocupam a
              largura. Preview de visibilidade vem abaixo dos controles. Nenhuma
              ação depende de hover.
            </p>
          </div>
          <div>
            <h3>Estado e versão</h3>
            <p>
              Dados do protótipo vivem em memória e reiniciam ao trocar o
              cenário. A implementação deve persistir versões, acordos, anexos,
              eventos e permissões no servidor.
            </p>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="section-label">MAPA DE TELAS / ESPECIFICAÇÃO LEVE</div>
        <div className="spec-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tela</TableHead>
                <TableHead>Propósito</TableHead>
                <TableHead>Estados</TableHead>
                <TableHead>Componentes</TableHead>
                <TableHead>Fora desta tela</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {screens.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.purpose}</TableCell>
                  <TableCell>{s.states.join(" / ")}</TableCell>
                  <TableCell>{s.components}</TableCell>
                  <TableCell>{s.excludes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

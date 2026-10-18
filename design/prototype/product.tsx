"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Folder,
  Users,
  Bell,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Archive,
  Eye,
  EyeOff,
  FileText,
  Check,
  Clock,
  Download,
  Send,
  Pencil,
  Link as LinkIcon,
  Lock,
  ShieldCheck,
  Camera,
  GripVertical,
  Trash2,
  CalendarDays,
  CircleDollarSign,
  BriefcaseBusiness,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "./identity";
import { screens } from "./catalog";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
const initialProjects = [
  {
    name: "Casamento Clara & Miguel",
    client: "Clara Martins",
    status: "Em execução",
    date: "12 out, 2026",
    kind: "Fotografia de casamento",
    price: "R$ 6.800,00",
  },
  {
    name: "Retratos para um novo ciclo",
    client: "Marina Costa",
    status: "Alteração solicitada",
    date: "28 set, 2026",
    kind: "Ensaio profissional",
    price: "R$ 1.450,00",
  },
  {
    name: "Campanha Coleção Origens",
    client: "Ateliê Aurora",
    status: "Enviado",
    date: "05 out, 2026",
    kind: "Fotografia de produto",
    price: "R$ 3.200,00",
  },
  {
    name: "Ensaio de família no parque",
    client: "Rafael Nunes",
    status: "Rascunho",
    date: "18 out, 2026",
    kind: "Ensaio de família",
    price: "R$ 980,00",
  },
];
type ClientStage = "Contato recente" | "Proposta enviada" | "Projeto ativo";
type Client = {
  name: string;
  email: string;
  projects: number;
  stage: ClientStage;
  project: string;
  value: string;
  nextAction: string;
  lastContact: string;
};
const initialClients: Client[] = [
  {
    name: "Clara Martins",
    email: "clara.martins@example.com",
    projects: 1,
    stage: "Projeto ativo",
    project: "Casamento Clara & Miguel",
    value: "R$ 6.800",
    nextAction: "Enviar seleção até 10 nov",
    lastContact: "Hoje, 09:42",
  },
  {
    name: "Marina Costa",
    email: "marina.costa@example.com",
    projects: 2,
    stage: "Proposta enviada",
    project: "Retratos para um novo ciclo",
    value: "R$ 1.450",
    nextAction: "Responder ajuste solicitado",
    lastContact: "Ontem, 16:18",
  },
  {
    name: "Ateliê Aurora",
    email: "contato@atelieaurora.example",
    projects: 1,
    stage: "Proposta enviada",
    project: "Campanha Coleção Origens",
    value: "R$ 3.200",
    nextAction: "Confirmar aceite da proposta",
    lastContact: "18 set, 11:05",
  },
  {
    name: "Rafael Nunes",
    email: "rafael.nunes@example.com",
    projects: 1,
    stage: "Contato recente",
    project: "Ensaio de família no parque",
    value: "R$ 980",
    nextAction: "Definir briefing e disponibilidade",
    lastContact: "16 set, 14:30",
  },
];
type Phase = {
  id: number;
  name: string;
  timingType: string;
  timing: string;
  tasks: string[];
  deliverable: string;
  visible: boolean;
};
const initialPhases: Phase[] = [
  {
    id: 1,
    name: "Descoberta e alinhamento",
    timingType: "Data limite",
    timing: "Até 05 out",
    tasks: ["Reunião de kickoff", "Confirmar objetivos e referências"],
    deliverable: "Briefing aprovado",
    visible: true,
  },
  {
    id: 2,
    name: "Execução",
    timingType: "Período",
    timing: "12 out · 14h às 22h",
    tasks: ["Realizar o trabalho previsto", "Registrar decisões importantes"],
    deliverable: "Material bruto organizado",
    visible: true,
  },
  {
    id: 3,
    name: "Produção e refinamento",
    timingType: "Duração relativa",
    timing: "Até 20 dias após a execução",
    tasks: ["Preparar primeira versão", "Revisar qualidade da entrega"],
    deliverable: "Versão para revisão",
    visible: true,
  },
  {
    id: 4,
    name: "Entrega final",
    timingType: "Data limite",
    timing: "Até 12 nov",
    tasks: ["Publicar arquivos finais"],
    deliverable: "Entrega final aprovada",
    visible: true,
  },
];
type Payment = {
  id: number;
  kind: string;
  percent: number;
  trigger: string;
  due: string;
};
const initialPayments: Payment[] = [
  {
    id: 1,
    kind: "Entrada",
    percent: 30,
    trigger: "Na assinatura",
    due: "Na assinatura do contrato",
  },
  {
    id: 2,
    kind: "Saldo final",
    percent: 70,
    trigger: "Data específica",
    due: "10 / 10 / 2026",
  },
];
const blockNames = [
  "Escopo",
  "Etapas e prazos",
  "Tarefas",
  "Entregáveis",
  "Preço e condições",
  "Responsabilidades",
  "Anexos",
  "Notas internas",
];
const initialScope =
  "Cobertura fotográfica do casamento de Clara e Miguel, em Belo Horizonte. Oito horas de cobertura, dois fotógrafos e seleção autoral de 400 fotografias tratadas. Início às 14h.";
type Props = {
  initialScreen: string;
  preset: string;
  onNavigate?: (id: string) => void;
};
function NavItem({
  id,
  label,
  icon,
  active,
  go,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  go: (id: string) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        onClick={() => {
          go(id);
          setOpenMobile(false);
        }}
      >
        {icon}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
export function ContractPaper({
  name = "Casamento Clara & Miguel",
  scope = initialScope,
  version = 2,
}: {
  name?: string;
  scope?: string;
  version?: number;
}) {
  return (
    <article className="contract-paper">
      <div className="row-between">
        <Logo />
        <span className="small">CONTRATO / V{version}</span>
      </div>
      <hr />
      <span className="eyebrow">PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</span>
      <h2>{name}</h2>
      <p className="contract-note">
        Documento demonstrativo para avaliação de interface.
      </p>
      <div className="contract-parties">
        <div>
          <small>PROFISSIONAL</small>
          <strong>Helena Duarte Fotografia</strong>
          <p>helena.duarte@example.com</p>
        </div>
        <div>
          <small>CLIENTE</small>
          <strong>Clara Martins</strong>
          <p>clara.martins@example.com</p>
        </div>
      </div>
      <h3>01. O trabalho combinado</h3>
      <p>{scope}</p>
      <h3>02. Entrega e prazo</h3>
      <p>
        400 fotografias digitais em alta resolução, entregues até 12 de novembro
        de 2026. Uma rodada de ajuste de tratamento está incluída, solicitada em
        até 7 dias após a entrega.
      </p>
      <h3>03. Valor e condições</h3>
      <p>
        Valor total: R$ 6.800,00. Entrada de R$ 2.040,00 na contratação e saldo
        de R$ 4.760,00 até 10 de outubro de 2026. Pagamento combinado
        diretamente entre as partes.
      </p>
      <h3>04. Responsabilidades</h3>
      <p>
        Helena realiza a cobertura, seleção e tratamento. Clara confirma local,
        horários e autorização de acesso até 5 de outubro. Alterações comerciais
        exigem nova versão e novo aceite.
      </p>
      <h3>05. Concordância</h3>
      <p>
        A assinatura se refere exclusivamente à versão {version} deste documento
        e aos serviços descritos acima.
      </p>
      <div className="signature-lines">
        <span>
          Helena Duarte
          <br />
          <small>Profissional</small>
        </span>
        <span>
          Clara Martins
          <br />
          <small>Cliente</small>
        </span>
      </div>
      <footer>
        PJ Suite · Projeto 024 · Versão {version} <span>01 / 01</span>
      </footer>
    </article>
  );
}
export default function Product({ initialScreen, preset, onNavigate }: Props) {
  const [screen, setScreen] = useState(initialScreen);
  const [portal, setPortal] = useState(
    initialScreen.startsWith("client-") &&
      !["client-new", "client-edit", "client-archive"].includes(initialScreen),
  );
  const [state, setState] = useState(preset);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Ativos");
  const [projects, setProjects] = useState(initialProjects);
  const [clients, setClients] = useState(initialClients);
  const [archived, setArchived] = useState<string[]>([]);
  const [archivedClients, setArchivedClients] = useState<string[]>([]);
  const [title, setTitle] = useState("Casamento Clara & Miguel");
  const [clientName, setClientName] = useState("Clara Martins");
  const [email, setEmail] = useState("clara.martins@example.com");
  const [scope, setScope] = useState(initialScope);
  const [visible, setVisible] = useState(
    blockNames.map((_, i) => i !== 7 && i !== 2),
  );
  const [files, setFiles] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const [complete, setComplete] = useState(false);
  const [link, setLink] = useState(false);
  const [reason, setReason] = useState("");
  const [taskChecks, setTaskChecks] = useState([true, true, false, false]);
  const [version, setVersion] = useState(2);
  const [profileName, setProfileName] = useState("Helena Duarte");
  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedClient, setSelectedClient] = useState("Clara Martins");
  const [noticeRead, setNoticeRead] = useState(false);
  const [projectArea, setProjectArea] = useState("Software e desenvolvimento");
  const [startMode, setStartMode] = useState("Essencial");
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [phaseDraft, setPhaseDraft] = useState<Phase>({
    id: 0,
    name: "",
    timingType: "Data limite",
    timing: "",
    tasks: [],
    deliverable: "",
    visible: true,
  });
  const [projectTotal, setProjectTotal] = useState(6800);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  useEffect(() => {
    setScreen(initialScreen);
    setState(preset);
    setAgreed(false);
  }, [initialScreen, preset]);
  const go = (id: string) => {
    if (id !== "pdf")
      setPortal(
        id.startsWith("client-") &&
          !["client-new", "client-edit", "client-archive"].includes(id),
      );
    setScreen(id);
    setState("Padrão");
    setAgreed(false);
    setReason("");
    onNavigate?.(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const save = (message = "Alterações salvas.") => {
    setState("Sucesso");
    toast.success(message);
  };
  const fail = state === "Erro";
  const success = state === "Sucesso";
  const empty = state === "Vazio";
  const isClient =
    (screen === "pdf" && portal) ||
    (screen.startsWith("client-") &&
      !["client-new", "client-edit", "client-archive"].includes(screen)) ||
    screen === "invalid-link";
  const auth = ["login", "signup"].includes(screen);
  const meta = screens.find((s) => s.id === screen)!;
  const addFiles = (f: File[]) => {
    const ok = f.filter(
      (file) =>
        file.size <= 20 * 1024 * 1024 &&
        /\.(pdf|jpe?g|png|zip)$/i.test(file.name),
    );
    if (ok.length !== f.length)
      toast.error("Use PDF, JPG, PNG ou ZIP com até 20 MB.");
    setFiles((p) => [...p, ...ok.map((file) => file.name)]);
  };
  const copy = async () => {
    const url = new URL(window.location.href);
    url.search = "?screen=client-review&embed=1";
    try {
      await navigator.clipboard.writeText(url.toString());
      save("Link de demonstração copiado.");
    } catch {
      toast.error(
        "Não foi possível copiar. Selecione o link e copie manualmente.",
      );
    }
  };
  const openPhase = (phase?: Phase) => {
    setEditingPhaseId(phase?.id ?? null);
    setPhaseDraft(
      phase
        ? { ...phase, tasks: [...phase.tasks] }
        : {
            id: Date.now(),
            name: "",
            timingType: "Data limite",
            timing: "",
            tasks: [],
            deliverable: "",
            visible: true,
          },
    );
    setPhaseDialogOpen(true);
  };
  const savePhase = () => {
    if (!phaseDraft.name.trim()) {
      toast.error("Dê um nome para a etapa.");
      return;
    }
    setPhases((current) =>
      editingPhaseId
        ? current.map((phase) =>
            phase.id === editingPhaseId ? phaseDraft : phase,
          )
        : [...current, phaseDraft],
    );
    setPhaseDialogOpen(false);
    toast.success(editingPhaseId ? "Etapa atualizada." : "Nova etapa adicionada.");
  };
  const updatePayment = (id: number, patch: Partial<Payment>) =>
    setPayments((current) =>
      current.map((payment) =>
        payment.id === id ? { ...payment, ...patch } : payment,
      ),
    );
  const applyPaymentPreset = (presetName: string) => {
    if (presetName === "À vista") {
      setPayments([
        {
          id: Date.now(),
          kind: "Pagamento único",
          percent: 100,
          trigger: "Na assinatura",
          due: "Na assinatura do contrato",
        },
      ]);
    } else if (presetName === "3 parcelas") {
      setPayments([
        { id: Date.now(), kind: "Entrada", percent: 34, trigger: "Na assinatura", due: "Na assinatura do contrato" },
        { id: Date.now() + 1, kind: "Parcela intermediária", percent: 33, trigger: "Início de etapa", due: "No início da execução" },
        { id: Date.now() + 2, kind: "Saldo final", percent: 33, trigger: "Antes da entrega", due: "Antes da publicação final" },
      ]);
    } else {
      setPayments(initialPayments.map((payment) => ({ ...payment })));
    }
    toast.success(`Plano “${presetName}” aplicado.`);
  };
  const paymentPercent = payments.reduce(
    (total, payment) => total + payment.percent,
    0,
  );
  const money = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  const actions = (label: string, next?: string) => (
    <div className="form-actions">
      <Button
        variant="outline"
        onClick={() => go(isClient ? "client-review" : "projects")}
      >
        Cancelar
      </Button>
      <Button
        onClick={() => {
          if (next) go(next);
          else save();
        }}
      >
        {label}
        <ArrowRight size={16} />
      </Button>
    </div>
  );
  const section = (label: string, children: ReactNode, extra?: ReactNode) => (
    <section className="surface">
      <div className="row-between section-heading">
        <h2>{label}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
  const heading = (label: string, sub: string, action?: ReactNode) => (
    <header className="page-heading">
      <div>
        <span className="eyebrow">
          {isClient ? "SEU PROJETO, EM UM SÓ LUGAR" : "ESPAÇO DE TRABALHO"}
        </span>
        <h1>{label}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </header>
  );
  const errorBanner = fail ? (
    <Banner title="Não foi possível concluir." tone="danger">
      Seus dados foram mantidos. Confira os campos e tente novamente.{" "}
      <button className="text-link" onClick={() => setState("Padrão")}>
        Tentar novamente
      </button>
    </Banner>
  ) : null;
  const successBanner = success ? (
    <Banner title="Tudo certo. Alterações salvas." tone="success">
      O registro foi atualizado nesta demonstração.
    </Banner>
  ) : null;
  const upload = (
    <>
      <UploadBox onFiles={addFiles} />
      {files.map((f, i) => (
        <div className="row-between" key={f + i}>
          <FileRow name={f} meta="Anexo selecionado · demonstração local" />
          <Button
            variant="ghost"
            aria-label={"Remover " + f}
            onClick={() => setFiles(files.filter((_, n) => n !== i))}
          >
            Remover
          </Button>
        </div>
      ))}
    </>
  );
  const projectSummary = (
    <div className="project-summary">
      <div>
        <small>CLIENTE</small>
        <strong>Clara Martins</strong>
      </div>
      <div>
        <small>DATA DO EVENTO</small>
        <strong>12 out, 2026</strong>
      </div>
      <div>
        <small>VALOR TOTAL</small>
        <strong>R$ 6.800,00</strong>
      </div>
      <div>
        <small>ENTREGA FINAL</small>
        <strong>12 nov, 2026</strong>
      </div>
    </div>
  );
  const projectTabs = (
    <Tabs
      className="project-tabs"
      value={
        ["execution", "delivery", "history"].includes(screen)
          ? screen
          : "execution"
      }
      onValueChange={go}
    >
      <TabsList variant="line">
        <TabsTrigger value="execution">Execução</TabsTrigger>
        <TabsTrigger value="delivery">Entregas</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>
    </Tabs>
  );
  const clientIntro = (
    <div className="client-project-intro">
      <span className="eyebrow">HELENA DUARTE FOTOGRAFIA / PROJETO 024</span>
      <h1>{title}</h1>
      <p>Os detalhes de um dia que merece ser lembrado.</p>
      <div className="client-byline">
        <Avatar />
        <span>
          Preparado por <strong>{profileName}</strong>
        </span>
        <Badge>{signed ? "Assinado" : "Enviado"}</Badge>
      </div>
    </div>
  );
  const clientBlocks = (
    <>
      {visible[0] && section("O que vamos criar", <p>{scope}</p>)}
      {visible[1] &&
        section(
          "Do primeiro encontro à entrega",
          <div className="phase-list">
            {phases.filter((phase) => phase.visible).map((phase, i) => (
              <div key={phase.id}>
                <span className="phase-number">0{i + 1}</span>
                <div>
                  <strong>{phase.name}</strong>
                  <small>{phase.timing}</small>
                </div>
              </div>
            ))}
          </div>,
        )}
      {visible[2] &&
        section(
          "Tarefas compartilhadas",
          <p>Confirmar cronograma do evento · Clara Martins · até 05 out.</p>,
        )}
      {visible[3] &&
        section(
          "O que você recebe",
          <>
            <h3>400 fotografias, com o olhar da Helena.</h3>
            <p>
              Arquivos digitais em alta resolução, seleção autoral e tratamento
              de cor. Uma rodada de ajustes incluída.
            </p>
          </>,
        )}
      {visible[4] &&
        section(
          "Investimento",
          <>
            <div className="price">
              {money(projectTotal)}
            </div>
            <div className="client-payment-plan">
              {payments.map((payment) => (
                <p key={payment.id}>
                  <strong>{payment.percent}% · {payment.kind}</strong>
                  <span>{payment.due}</span>
                </p>
              ))}
            </div>
            <p>Pagamento combinado diretamente com a profissional.</p>
          </>,
        )}
      {visible[5] &&
        section(
          "O que cada um faz",
          <div className="two-col">
            <div>
              <h3>Helena</h3>
              <p>Cobertura, seleção, tratamento e entrega.</p>
            </div>
            <div>
              <h3>Clara</h3>
              <p>Confirmar local, horários e acesso até 05 out.</p>
            </div>
          </div>,
        )}
      {visible[6] &&
        section(
          "Arquivos do projeto",
          <FileRow
            name="Referências do casamento.pdf"
            meta="PDF · 1,8 MB · anexo demonstrativo"
            onClick={() =>
              toast.info(
                "Arquivo demonstrativo. O documento disponível é o contrato no próximo bloco.",
              )
            }
          />,
        )}
      {visible[7] &&
        section(
          "Notas compartilhadas",
          <p>Preferência por fotografias espontâneas e luz natural.</p>,
        )}
    </>
  );
  let content: ReactNode;
  if (state === "Carregando") {
    content = <Loading />;
  } else if (auth) {
    content = (
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
          <h1>
            {screen === "login"
              ? "Bom ter você aqui."
              : "Comece pelo seu nome."}
          </h1>
          <p>
            {screen === "login"
              ? "Entre para dar continuidade aos seus projetos."
              : "Crie sua conta e dê forma ao próximo projeto."}
          </p>
          {errorBanner}
          {success ? (
            <>
              <Banner
                title={
                  screen === "login" ? "Você entrou." : "Sua conta foi criada."
                }
                tone="success"
              >
                Vamos preparar seu espaço de trabalho.
              </Banner>
              <Button
                onClick={() => go(screen === "login" ? "projects" : "profile")}
              >
                Continuar
                <ArrowRight />
              </Button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!authEmail.includes("@") || password.length < 8) {
                  setState("Erro");
                  return;
                }
                setState("Sucesso");
              }}
            >
              {screen === "signup" && (
                <Field
                  label="Seu nome"
                  placeholder="Como você quer ser chamado?"
                  required
                />
              )}
              <Field
                label="E-mail"
                type="email"
                value={authEmail}
                onChange={setAuthEmail}
                placeholder="voce@exemplo.com"
                required
                error={fail ? "Confira seu e-mail." : undefined}
              />
              <Field
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Pelo menos 8 caracteres"
                required
                error={
                  fail
                    ? "Confira a senha. Use pelo menos 8 caracteres."
                    : undefined
                }
              />
              {screen === "signup" && (
                <p className="small">
                  Demonstração de cadastro. Use dados fictícios.
                </p>
              )}
              <Button type="submit" className="full">
                {screen === "login" ? "Entrar" : "Criar minha conta"}
                <ArrowRight size={18} />
              </Button>
            </form>
          )}
          <p className="auth-switch">
            {screen === "login"
              ? "Ainda não tem uma conta?"
              : "Já tem uma conta?"}{" "}
            <button onClick={() => go(screen === "login" ? "signup" : "login")}>
              {screen === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
          <p className="prototype-note">
            <Lock size={14} /> Protótipo · não use sua senha real.
          </p>
        </div>
      </div>
    );
  } else if (screen === "profile") {
    content = (
      <>
        {heading(
          "Um perfil com a sua assinatura.",
          "Esses dados apresentam você nos projetos e contratos.",
        )}
        {errorBanner}
        {successBanner}
        <form
          className="form-surface"
          onSubmit={(e) => {
            e.preventDefault();
            save("Perfil salvo.");
            go("clients");
          }}
        >
          <div className="profile-banner">
            <Avatar size="large" name={profileName} />
            <div>
              <h3>{profileName}</h3>
              <p>Seu nome acompanha cada projeto.</p>
            </div>
          </div>
          <div className="two-col">
            <Field
              label="Nome profissional"
              value={profileName}
              onChange={setProfileName}
              required
            />
            <Field label="Nome do negócio" value="Helena Duarte Fotografia" />
            <Field
              label="E-mail de contato"
              value="helena.duarte@example.com"
              type="email"
              required
            />
            <Field label="Telefone" value="(31) 99900-0124" />
            <Choice
              label="Área de atuação"
              options={[
                "Fotografia",
                "Design",
                "Produção",
                "Outros serviços criativos",
              ]}
            />
            <Field label="Cidade" value="Belo Horizonte, MG" />
          </div>
          <Field
            label="Apresentação curta"
            value="Fotografia afetiva para histórias reais. Casamentos e retratos em Belo Horizonte."
            area
          />
          <div className="form-actions">
            <Button type="submit">
              Salvar perfil e continuar
              <ArrowRight />
            </Button>
          </div>
        </form>
      </>
    );
  } else if (screen === "clients" || screen === "client-archive") {
    const list = empty
      ? []
      : clients.filter(
          (c) =>
            !archivedClients.includes(c.name) &&
            `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
        );
    content = (
      <>
        {heading(
          "Clientes",
          "Boas relações começam com os detalhes certos.",
          <Button onClick={() => go("client-new")}>
            <Plus />
            Novo cliente
          </Button>,
        )}
        {errorBanner}
        <div className="client-pulse" aria-label="Resumo da carteira">
          <div>
            <Users size={18} />
            <span><strong>{list.length}</strong> relações ativas</span>
          </div>
          <div>
            <CircleDollarSign size={18} />
            <span><strong>R$ 12.430</strong> em projetos</span>
          </div>
          <div>
            <CalendarDays size={18} />
            <span><strong>3</strong> próximos passos</span>
          </div>
        </div>
        <div className="list-toolbar">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar cliente"
              placeholder="Buscar por nome ou e-mail"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="small">Arraste o olhar do contato à execução</span>
        </div>
        {list.length ? (
          <div className="client-board">
            {(["Contato recente", "Proposta enviada", "Projeto ativo"] as ClientStage[]).map((stage) => {
              const stageClients = list.filter((client) => client.stage === stage);
              return (
                <section className="client-column" key={stage}>
                  <header>
                    <div>
                      <span className={`stage-dot stage-${stage.replaceAll(" ", "-").toLowerCase()}`} />
                      <strong>{stage}</strong>
                    </div>
                    <span>{stageClients.length}</span>
                  </header>
                  <div className="client-column-body">
                    {stageClients.map((c) => (
                      <article className="client-card" key={c.name}>
                        <div className="client-card-head">
                          <div className="person">
                            <Avatar name={c.name} />
                            <div>
                              <strong>{c.name}</strong>
                              <small>{c.email}</small>
                            </div>
                          </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={"Ações de " + c.name}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setClientName(c.name);
                              setEmail(c.email);
                              setSelectedClient(c.name);
                              go("client-edit");
                            }}
                          >
                            Editar cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClient(c.name);
                              go("client-archive");
                            }}
                          >
                            Arquivar cliente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                        </div>
                        <div className="client-project-name">
                          <BriefcaseBusiness size={15} />
                          <span>{c.project}</span>
                        </div>
                        <div className="client-card-metrics">
                          <span><small>VALOR</small><strong>{c.value}</strong></span>
                          <span><small>PROJETOS</small><strong>{c.projects}</strong></span>
                        </div>
                        <div className="next-action">
                          <small>PRÓXIMO PASSO</small>
                          <strong>{c.nextAction}</strong>
                          <span>Último contato: {c.lastContact}</span>
                        </div>
                        {stage !== "Projeto ativo" && (
                          <Button
                            variant="ghost"
                            className="advance-client"
                            onClick={() => {
                              const nextStage: ClientStage = stage === "Contato recente" ? "Proposta enviada" : "Projeto ativo";
                              setClients(clients.map((client) => client.name === c.name ? { ...client, stage: nextStage } : client));
                              toast.success(`${c.name} movido para ${nextStage.toLowerCase()}.`);
                            }}
                          >
                            Mover para {stage === "Contato recente" ? "proposta" : "projeto ativo"}
                            <ArrowRight size={15} />
                          </Button>
                        )}
                      </article>
                    ))}
                    {!stageClients.length && (
                      <div className="client-column-empty">Nenhum cliente nesta etapa.</div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Blank
            title={
              query
                ? "Nenhum cliente encontrado."
                : "Seu primeiro cliente começa uma história."
            }
            description={
              query
                ? "Tente outro nome ou e-mail."
                : "Cadastre um cliente para criar o primeiro projeto."
            }
            action={query ? "Limpar busca" : "Cadastrar cliente"}
            onClick={() => (query ? setQuery("") : go("client-new"))}
          />
        )}
        <AlertDialog
          open={screen === "client-archive" && !success}
          onOpenChange={(o) => !o && go("clients")}
        >
          <AlertDialogContent>
            <AlertDialogTitle>Arquivar {selectedClient}?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente sai da lista ativa. Seus projetos, contratos e histórico
              são preservados.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => go("clients")}>
                Manter cliente
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setArchivedClients([...archivedClients, selectedClient]);
                  go("clients");
                  toast.success("Cliente arquivado.");
                }}
              >
                Arquivar cliente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {screen === "client-archive" && success && (
          <Banner title="Cliente arquivado." tone="success">
            Projetos e histórico foram preservados.
          </Banner>
        )}
      </>
    );
  } else if (screen === "client-new" || screen === "client-edit") {
    content = (
      <>
        {heading(
          screen === "client-new"
            ? "Quem é o seu próximo cliente?"
            : "Os detalhes fazem diferença.",
          "Dados de contato e identificação para o projeto.",
        )}
        {errorBanner}
        {successBanner}
        <form
          className="form-surface"
          onSubmit={(e) => {
            e.preventDefault();
            if (!clientName.trim() || !email.includes("@")) {
              setState("Erro");
              return;
            }
            if (screen === "client-new")
              setClients([
                ...clients,
                {
                  name: clientName,
                  email,
                  projects: 0,
                  stage: "Contato recente",
                  project: "Projeto ainda não iniciado",
                  value: "A definir",
                  nextAction: "Criar o primeiro projeto",
                  lastContact: "Agora",
                },
              ]);
            else
              setClients(
                clients.map((c) =>
                  c.name === selectedClient
                    ? { ...c, name: clientName, email }
                    : c,
                ),
              );
            toast.success("Cliente salvo.");
            go("clients");
          }}
        >
          <div className="two-col">
            <Field
              label="Nome completo / razão social"
              value={clientName}
              onChange={setClientName}
              required
              error={fail ? "Informe o nome do cliente." : undefined}
            />
            <Choice
              label="Tipo de cliente"
              options={["Pessoa física", "Pessoa jurídica"]}
            />
            <Field
              label="E-mail"
              value={email}
              onChange={setEmail}
              type="email"
              required
            />
            <Field label="Telefone" value="(31) 98800-0156" />
            <Field label="CPF / CNPJ" placeholder="Informar no contrato" />
            <Field label="Cidade" value="Belo Horizonte, MG" />
          </div>
          <Field
            label="Observação interna"
            area
            value="Casamento em outubro. Prefere contato por e-mail."
          />
          <p className="small">
            <EyeOff size={14} /> Esta observação não aparece no link do cliente.
          </p>
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => go("clients")}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Salvar cliente
              <Check />
            </Button>
          </div>
        </form>
      </>
    );
  } else if (["projects", "project-archive", "duplicate"].includes(screen)) {
    const list = empty
      ? []
      : projects.filter(
          (p) =>
            (tab === "Arquivados"
              ? archived.includes(p.name)
              : !archived.includes(p.name)) &&
            `${p.name} ${p.client}`.toLowerCase().includes(query.toLowerCase()),
        );
    content = (
      <>
        {heading(
          "Cada projeto, uma história.",
          "Do primeiro combinado à entrega final.",
          <Button onClick={() => go("project-new")}>
            <Plus />
            Novo projeto
          </Button>,
        )}
        {errorBanner}
        <div className="list-toolbar">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line">
              <TabsTrigger value="Ativos">
                Ativos{" "}
                <span className="tab-count">
                  {projects.length - archived.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="Arquivados">Arquivados</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar projeto"
              placeholder="Buscar projeto ou cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {list.length ? (
          <div className="project-grid">
            {list.map((p, i) => (
              <article className="project-card" key={p.name}>
                <div className="row-between">
                  <span className="project-icon">
                    <Camera size={22} />
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={"Ações de " + p.name}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setTitle(p.name);
                          go("project-edit");
                        }}
                      >
                        Editar projeto
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setTitle(p.name + " — cópia");
                          go("duplicate");
                        }}
                      >
                        Duplicar projeto
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setTitle(p.name);
                          go("project-archive");
                        }}
                      >
                        Arquivar projeto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <small>{p.kind}</small>
                <button
                  className="project-title"
                  onClick={() => {
                    setTitle(p.name);
                    go(
                      p.status === "Em execução"
                        ? "execution"
                        : p.status === "Alteração solicitada"
                          ? "revision"
                          : "builder",
                    );
                  }}
                >
                  {p.name}
                  <ArrowUpRightIcon />
                </button>
                <p>{p.client}</p>
                <Badge>{p.status}</Badge>
                <footer>
                  <span>
                    <Clock size={14} />
                    {p.date}
                  </span>
                  <strong>{p.price}</strong>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <Blank
            title={
              query
                ? "Nenhum projeto encontrado."
                : tab === "Arquivados"
                  ? "Nenhum projeto arquivado."
                  : "Um bom projeto começa com um combinado."
            }
            description={
              query
                ? "Busque pelo nome do projeto ou do cliente."
                : tab === "Arquivados"
                  ? "Projetos arquivados aparecerão aqui, com o histórico preservado."
                  : "Crie seu primeiro projeto e reúna todos os detalhes."
            }
            action={
              query
                ? "Limpar busca"
                : tab === "Arquivados"
                  ? "Ver projetos ativos"
                  : "Criar projeto"
            }
            onClick={() =>
              query
                ? setQuery("")
                : tab === "Arquivados"
                  ? setTab("Ativos")
                  : go("project-new")
            }
          />
        )}
        <div className="quiet-note">
          <ShieldCheck size={18} />
          <span>
            Seu trabalho, bem combinado. Contratos e decisões ficam junto de
            cada projeto.
          </span>
        </div>
        <AlertDialog
          open={screen === "project-archive" && !success}
          onOpenChange={(o) => !o && go("projects")}
        >
          <AlertDialogContent>
            <AlertDialogTitle>Arquivar este projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              {title} sairá da lista de ativos. O contrato, o link e o histórico
              permanecem disponíveis.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => go("projects")}>
                Manter ativo
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setArchived([...archived, title]);
                  go("projects");
                  toast.success("Projeto arquivado.");
                }}
              >
                Arquivar projeto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog
          open={screen === "duplicate" && !success}
          onOpenChange={(o) => !o && go("projects")}
        >
          <DialogContent>
            <DialogTitle>Um novo começo, com a mesma base.</DialogTitle>
            <DialogDescription>
              Copie escopo, etapas e condições. Assinatura, link e histórico não
              serão copiados.
            </DialogDescription>
            <Field
              label="Nome do novo projeto"
              value={title}
              onChange={setTitle}
            />
            <Choice label="Cliente" options={clients.map((c) => c.name)} />
            <Button
              onClick={() => {
                setProjects([
                  ...projects,
                  { ...initialProjects[0], name: title, status: "Rascunho" },
                ]);
                go("builder");
                toast.success("Novo rascunho criado.");
              }}
            >
              Duplicar como rascunho
              <Copy />
            </Button>
          </DialogContent>
        </Dialog>
        {success && (
          <Banner
            title={
              screen === "duplicate"
                ? "Novo rascunho criado."
                : "Projeto arquivado."
            }
            tone="success"
          >
            Seu histórico foi preservado.
          </Banner>
        )}
      </>
    );
  } else if (screen === "project-new" || screen === "project-edit") {
    content = (
      <>
        {heading(
          screen === "project-new"
            ? "Comece pelo essencial."
            : "Detalhes do projeto",
          "Dê contexto agora. Etapas, prazos e pagamentos ganham forma na montagem.",
        )}
        {errorBanner}
        {successBanner}
        <form
          className="form-surface project-start-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) {
              setState("Erro");
              return;
            }
            if (screen === "project-new")
              setProjects([
                ...projects,
                { ...initialProjects[0], name: title, status: "Rascunho" },
              ]);
            go("builder");
          }}
        >
          <div className="two-col">
            <Field
              label="Nome do projeto"
              value={title}
              onChange={setTitle}
              required
            />
            <Choice
              label="Cliente"
              options={clients.map((c) => c.name)}
              onChange={setSelectedClient}
            />
            <Choice
              label="Área do trabalho"
              options={[
                "Software e desenvolvimento",
                "Design e marca",
                "Fotografia e vídeo",
                "Consultoria",
                "Produção e eventos",
                "Outro serviço profissional",
              ]}
              value={projectArea}
              onChange={setProjectArea}
            />
            <Field
              label="Referência interna (opcional)"
              placeholder="Ex.: PJ-2026-024"
            />
          </div>
          <Field
            label="Objetivo do projeto"
            area
            value="Criar e entregar uma solução clara, alinhada aos objetivos do cliente e com critérios de aprovação definidos."
          />
          <fieldset className="start-mode">
            <legend>Como você quer começar a montagem?</legend>
            <p>Isso só prepara a estrutura inicial. Tudo poderá ser alterado.</p>
            <div className="start-mode-grid">
              {[
                {
                  name: "Em branco",
                  copy: "Você adiciona cada etapa do seu jeito.",
                },
                {
                  name: "Essencial",
                  copy: "Briefing, execução, revisão e entrega.",
                },
                {
                  name: "Estrutura sugerida",
                  copy: `Uma base adaptada para ${projectArea.toLowerCase()}.`,
                },
              ].map((mode) => (
                <button
                  type="button"
                  key={mode.name}
                  className={startMode === mode.name ? "selected" : ""}
                  onClick={() => setStartMode(mode.name)}
                >
                  <span className="mode-radio" aria-hidden="true" />
                  <strong>{mode.name}</strong>
                  <small>{mode.copy}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="setup-flow" aria-label="Próximos passos da configuração">
            {[
              ["01", "Detalhes", "agora"],
              ["02", "Estrutura", "a seguir"],
              ["03", "Valores", "na montagem"],
              ["04", "Visibilidade", "antes de enviar"],
            ].map(([number, label, note]) => (
              <div key={number}>
                <span>{number}</span>
                <strong>{label}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          {screen === "project-edit" && (
            <Banner title="Alterações comerciais geram uma nova versão.">
              Contratos já assinados permanecem preservados.
            </Banner>
          )}
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => go("projects")}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Criar e montar projeto
              <ArrowRight />
            </Button>
          </div>
        </form>
      </>
    );
  } else if (screen === "builder") {
    content = (
      <>
        {heading(
          title,
          "Monte uma estrutura que acompanha o seu jeito de trabalhar.",
          <Badge>Rascunho</Badge>,
        )}
        <div className="stepper">
          <strong>01 Montagem</strong>
          <span>02 Visibilidade</span>
          <span>03 Contrato</span>
          <span>04 Compartilhar</span>
        </div>
        {errorBanner}
        {successBanner}
        <div className="editor-layout">
          <div className="stack">
            {section(
              "01 / Escopo",
              <Field
                label="O que será feito e qual resultado deve ser alcançado?"
                value={scope}
                onChange={setScope}
                area
                required
              />,
            )}
            {section(
              "02 / Etapas, tarefas e entregáveis",
              <>
                <p className="section-intro">
                  Crie quantas etapas precisar. Cada uma pode ter data, período,
                  duração relativa ou apenas um marco de conclusão.
                </p>
                <div className="phase-list">
                  {phases.map((phase, i) => (
                    <div className="phase-item" key={phase.id}>
                      <GripVertical className="phase-grip" size={17} aria-hidden="true" />
                      <span className="phase-number">{String(i + 1).padStart(2, "0")}</span>
                      <div className="phase-content">
                        <div className="phase-title-line">
                          <h3>{phase.name}</h3>
                          {!phase.visible && <span className="private-label"><EyeOff size={12} /> interno</span>}
                        </div>
                        <small>{phase.timingType} · {phase.timing || "prazo a definir"}</small>
                        <p>
                          {phase.tasks.length} {phase.tasks.length === 1 ? "tarefa" : "tarefas"}
                          {phase.deliverable ? ` · ${phase.deliverable}` : " · sem entregável"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={"Editar " + phase.name}
                        onClick={() => openPhase(phase)}
                      >
                        <Pencil size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <button className="add-phase-row" type="button" onClick={() => openPhase()}>
                  <Plus size={18} />
                  <span><strong>Adicionar nova etapa</strong><small>Defina tarefas, prazo, entregável e visibilidade.</small></span>
                </button>
              </>,
              <Button variant="outline" onClick={() => openPhase()}>
                <Plus size={16} /> Nova etapa
              </Button>,
            )}
            {section(
              "03 / Resultado final",
              <Field
                label="O que encerra o projeto?"
                area
                value="Arquivos finais publicados, documentação essencial e uma rodada de ajustes concluída."
              />,
            )}
            {section(
              "04 / Investimento e plano de pagamento",
              <>
                <div className="payment-head">
                  <Field
                    label="Valor total do projeto (R$)"
                    value={String(projectTotal)}
                    onChange={(value) => setProjectTotal(Number(value.replace(/\D/g, "")) || 0)}
                  />
                  <div className="payment-presets">
                    <span className="field-label">Usar uma estrutura</span>
                    <div>
                      {["30% + saldo", "3 parcelas", "À vista"].map((presetName) => (
                        <button type="button" key={presetName} onClick={() => applyPaymentPreset(presetName)}>
                          {presetName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="payment-progress">
                  <div style={{ width: `${Math.min(paymentPercent, 100)}%` }} />
                </div>
                <div className={`payment-balance ${paymentPercent === 100 ? "balanced" : ""}`}>
                  <strong>{paymentPercent}% distribuído</strong>
                  <span>{paymentPercent === 100 ? "Plano fechado" : `Faltam ${100 - paymentPercent}% para fechar o valor`}</span>
                </div>
                <div className="payment-list">
                  {payments.map((payment, index) => (
                    <article className="payment-card" key={payment.id}>
                      <div className="payment-card-title">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{payment.kind}</strong>
                        {payments.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover ${payment.kind}`}
                            onClick={() => setPayments(payments.filter((item) => item.id !== payment.id))}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                      <div className="payment-grid">
                        <Choice
                          label="Tipo"
                          value={payment.kind}
                          options={["Entrada", "Parcela intermediária", "Saldo final", "Pagamento único"]}
                          onChange={(kind) => updatePayment(payment.id, { kind })}
                        />
                        <Choice
                          label="Quando cobrar"
                          value={payment.trigger}
                          options={["Na assinatura", "Data específica", "Início de etapa", "Antes da entrega", "Após aprovação"]}
                          onChange={(trigger) => updatePayment(payment.id, { trigger })}
                        />
                      </div>
                      <div className="payment-split">
                        <div className="percent-control">
                          <div><span>Percentual</span><strong>{payment.percent}%</strong></div>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[payment.percent]}
                            onValueChange={(value) => updatePayment(payment.id, { percent: value[0] })}
                            aria-label={`Percentual de ${payment.kind}`}
                          />
                        </div>
                        <div className="payment-value">
                          <small>VALOR</small>
                          <strong>{money(projectTotal * payment.percent / 100)}</strong>
                        </div>
                      </div>
                      <Field
                        label="Data ou condição"
                        value={payment.due}
                        onChange={(due) => updatePayment(payment.id, { due })}
                        placeholder="Ex.: 5 dias após a aprovação"
                      />
                    </article>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPayments([...payments, {
                    id: Date.now(),
                    kind: "Parcela intermediária",
                    percent: 0,
                    trigger: "Início de etapa",
                    due: "",
                  }])}
                >
                  <Plus size={16} /> Adicionar pagamento
                </Button>
                <p className="small payment-note">
                  O PJ Suite organiza o combinado. A cobrança continua acontecendo diretamente entre você e o cliente.
                </p>
              </>,
            )}
            {section(
              "05 / Responsabilidades",
              <div className="two-col">
                <Field
                  label="Do profissional"
                  area
                  value="Executar o escopo, comunicar impedimentos e publicar as entregas nos marcos combinados."
                />
                <Field
                  label="Do cliente"
                  area
                  value="Fornecer acessos e informações, revisar entregas e responder dentro dos prazos combinados."
                />
              </div>,
            )}
            {section(
              "06 / Anexos",
              <>
                {upload}
                <FileRow
                  name="Briefing e referências.pdf"
                  meta="PDF · 1,8 MB"
                />
              </>,
            )}
          </div>
          <aside className="editor-side">
            {section(
              "Estrutura do projeto",
              <>
                <div className="builder-summary"><span><strong>{phases.length}</strong> etapas</span><span><strong>{phases.reduce((total, phase) => total + phase.tasks.length, 0)}</strong> tarefas</span></div>
                <div className="builder-summary"><span><strong>{money(projectTotal)}</strong> total</span><span><strong>{payments.length}</strong> pagamentos</span></div>
                <p className="small">A estrutura não é fixa. Você pode voltar e ajustar tudo antes de finalizar o contrato.</p>
              </>,
            )}
            {section(
              "Notas internas",
              <>
                <Field
                  label="Só você vê"
                  area
                  value="Conferir bateria reserva e logística da equipe."
                />
                <p className="small">
                  <EyeOff size={14} /> Oculto do cliente por padrão.
                </p>
              </>,
            )}
            <Button
              className="full"
              onClick={() => {
                save("Montagem salva.");
                go("visibility");
              }}
            >
              Ajustar visibilidade
              <ArrowRight />
            </Button>
            <Button
              variant="ghost"
              className="full"
              onClick={() => save("Rascunho salvo.")}
            >
              Salvar rascunho
            </Button>
          </aside>
        </div>
        <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
          <DialogContent className="phase-dialog">
            <DialogTitle>{editingPhaseId ? "Configurar etapa" : "Adicionar etapa"}</DialogTitle>
            <DialogDescription>
              Use apenas o que fizer sentido para este projeto. Nenhum tipo de prazo é obrigatório.
            </DialogDescription>
            <Field
              label="Nome da etapa"
              value={phaseDraft.name}
              onChange={(name) => setPhaseDraft({ ...phaseDraft, name })}
              placeholder="Ex.: Desenvolvimento do MVP"
              required
            />
            <div className="two-col">
              <Choice
                label="Como o prazo funciona?"
                value={phaseDraft.timingType}
                options={["Data limite", "Data específica", "Período", "Duração relativa", "Marco sem data", "Sem prazo"]}
                onChange={(timingType) => setPhaseDraft({ ...phaseDraft, timingType })}
              />
              <Field
                label="Prazo ou referência"
                value={phaseDraft.timing}
                onChange={(timing) => setPhaseDraft({ ...phaseDraft, timing })}
                placeholder="Ex.: 10 dias após o kickoff"
                disabled={phaseDraft.timingType === "Sem prazo"}
              />
            </div>
            <Field
              label="Tarefas — uma por linha"
              area
              value={phaseDraft.tasks.join("\n")}
              onChange={(tasks) => setPhaseDraft({ ...phaseDraft, tasks: tasks.split(/\r?\n/).filter(Boolean) })}
              placeholder={"Configurar ambiente\nImplementar fluxo principal\nRevisar com o cliente"}
            />
            <Field
              label="Entregável ou critério de conclusão"
              value={phaseDraft.deliverable}
              onChange={(deliverable) => setPhaseDraft({ ...phaseDraft, deliverable })}
              placeholder="Ex.: MVP disponível para homologação"
            />
            <div className="phase-visibility">
              <div><strong>Visível para o cliente</strong><small>Mostra esta etapa e seus marcos no link compartilhado.</small></div>
              <Switch
                checked={phaseDraft.visible}
                onCheckedChange={(visible) => setPhaseDraft({ ...phaseDraft, visible })}
              />
            </div>
            <div className="dialog-actions">
              {editingPhaseId && (
                <Button
                  variant="ghost"
                  className="danger-text"
                  onClick={() => {
                    setPhases(phases.filter((phase) => phase.id !== editingPhaseId));
                    setPhaseDialogOpen(false);
                    toast.success("Etapa removida.");
                  }}
                >
                  <Trash2 size={16} /> Remover etapa
                </Button>
              )}
              <Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>Cancelar</Button>
              <Button onClick={savePhase}>{editingPhaseId ? "Salvar etapa" : "Adicionar etapa"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  } else if (screen === "visibility") {
    content = (
      <>
        {heading(
          "O cliente vê o que faz sentido.",
          "Ligue ou desligue os blocos e confira a prévia ao lado.",
        )}
        {successBanner}
        <div className="visibility-layout">
          <section className="surface visibility-controls">
            <h2>Visibilidade dos blocos</h2>
            <p>Identificação e contrato são sempre visíveis.</p>
            {blockNames.map((s, i) => (
              <div className="switch-row" key={s}>
                <label htmlFor={"visible-" + i}>
                  <strong>{s}</strong>
                  <small>
                    {visible[i] ? "Visível para o cliente" : "Só você vê"}
                  </small>
                </label>
                <Switch
                  id={"visible-" + i}
                  checked={visible[i]}
                  onCheckedChange={(v) =>
                    setVisible(visible.map((b, n) => (n === i ? v : b)))
                  }
                />
              </div>
            ))}
            <Button className="full" onClick={() => go("contract")}>
              Conferir contrato
              <ArrowRight />
            </Button>
          </section>
          <div className="client-preview">
            <div className="preview-label">
              <Eye size={16} /> ASSIM O CLIENTE VÊ
            </div>
            <div className="client-preview-body">
              {clientIntro}
              {clientBlocks}
            </div>
          </div>
        </div>
      </>
    );
  } else if (screen === "contract" || screen === "pdf") {
    content = (
      <>
        {heading(
          screen === "contract"
            ? "Tudo combinado, por escrito."
            : "Contrato do projeto",
          `Versão ${version} · Clara Martins · Helena Duarte`,
          <Button variant="outline" onClick={() => window.print()}>
            <Download />
            Imprimir / salvar PDF
          </Button>,
        )}
        {errorBanner}
        {successBanner}
        {screen === "contract" && (
          <Banner title="Confira antes de finalizar.">
            A versão final preserva escopo, valor, condições e
            responsabilidades. Alterações posteriores geram uma nova versão.
          </Banner>
        )}
        <div className="contract-layout">
          <ContractPaper name={title} scope={scope} version={version} />
          <aside className="surface contract-aside">
            <h2>Conferência final</h2>
            {[
              "Cliente identificado",
              "Escopo preenchido",
              "Prazos definidos",
              "Preço e condições",
              "Responsabilidades",
            ].map((s) => (
              <p className="check-line" key={s}>
                <Check size={16} />
                {s}
              </p>
            ))}
            <p className="small">
              Texto demonstrativo. O conteúdo contratual definitivo será
              definido na implementação.
            </p>
            <Button
              className="full"
              onClick={() => {
                save("Contrato finalizado.");
                go(
                  screen === "contract"
                    ? "pdf"
                    : isClient
                      ? "client-review"
                      : "share",
                );
              }}
            >
              {screen === "contract"
                ? "Finalizar projeto"
                : isClient
                  ? "Voltar ao projeto"
                  : "Compartilhar projeto"}
              <ArrowRight />
            </Button>
          </aside>
        </div>
      </>
    );
  } else if (screen === "share") {
    content = (
      <>
        {heading(
          "Pronto para sair do rascunho.",
          "Compartilhe o projeto pelo canal que você já usa.",
        )}
        {errorBanner}
        <div className="share-layout">
          <section className="surface">
            <span className="round-icon">
              <LinkIcon />
            </span>
            <h2>Um link para todo o projeto.</h2>
            <p>
              Clara pode revisar, pedir alterações e assinar. Depois, acompanha
              o trabalho por aqui.
            </p>
            {link || success || state === "Visto" ? (
              <>
                <label className="field-label" htmlFor="share-url">
                  Link de demonstração
                </label>
                <div className="share-input">
                  <input
                    id="share-url"
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? window.location.origin +
                          "/?screen=client-review&embed=1"
                        : ""
                    }
                  />
                  <Button onClick={copy}>
                    <Copy />
                    Copiar
                  </Button>
                </div>
                <div className="share-status">
                  <Eye size={16} />
                  {state === "Visto"
                    ? "Cliente visualizou · 20 set, às 14h32"
                    : "Não visto · aguardando a primeira visualização"}
                </div>
                <Button variant="outline" onClick={() => go("client-review")}>
                  Abrir visão do cliente
                  <ArrowRight />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setLink(true);
                  toast.success("Link de demonstração gerado.");
                }}
              >
                Gerar link
                <LinkIcon />
              </Button>
            )}
            <p className="small">
              Protótipo: a abertura não registra visualização real. O estado
              “Visto” pode ser inspecionado no catálogo.
            </p>
          </section>
          <section className="surface">
            <h2>O que está sendo enviado</h2>
            <h3>{title}</h3>
            <p>Clara Martins · Contrato v{version}</p>
            <FileRow onClick={() => go("pdf")} />
            <Banner title="O mesmo link acompanha o projeto.">
              Decisões e entregas ficam reunidas para vocês dois.
            </Banner>
          </section>
        </div>
      </>
    );
  } else if (screen === "revision") {
    content = (
      <>
        {heading(
          "Um ajuste antes do sim.",
          "Confira o pedido de Clara e revise o combinado.",
          <Badge>Alteração solicitada</Badge>,
        )}
        {errorBanner}
        {successBanner}
        <Banner title="Clara pediu uma alteração." tone="warning">
          “Podemos começar a cobertura às 14h, para incluir os preparativos?” ·
          20 set, 14h32
        </Banner>
        <div className="form-surface">
          <Field
            label="Escopo atualizado"
            area
            value={scope}
            onChange={setScope}
          />
          <Field
            label="O que mudou nesta versão?"
            area
            value="Cobertura iniciando às 14h, incluindo os preparativos. Mantidas as oito horas e o valor total."
          />
          <Banner title={`A próxima publicação será a versão ${version + 1}.`}>
            O pedido e a versão anterior continuam no histórico.
          </Banner>
          <div className="form-actions">
            <Button variant="outline" onClick={() => go("history")}>
              Ver histórico
            </Button>
            <Button
              onClick={() => {
                setVersion(version + 1);
                go("share");
                setLink(true);
                toast.success("Nova versão disponível no link.");
              }}
            >
              Finalizar e reenviar
              <Send />
            </Button>
          </div>
        </div>
      </>
    );
  } else if (screen === "execution" || screen === "client-progress") {
    content = (
      <>
        {isClient
          ? clientIntro
          : heading(
              title,
              "Cada etapa, no seu tempo. Cada combinado, no seu lugar.",
              <Badge>Em execução</Badge>,
            )}
        {!isClient && projectTabs}
        {errorBanner}
        {empty ? (
          <Blank
            title="As próximas etapas aparecerão aqui."
            description="O contrato está assinado. A profissional vai organizar o início do trabalho."
          />
        ) : (
          <>
            <Banner
              title={
                isClient
                  ? "Sua história já está em produção."
                  : "Próximo passo: seleção e tratamento."
              }
            >
              A cobertura foi concluída. A entrega está prevista para 12 de
              novembro.
            </Banner>
            {projectSummary}
            <div className="execution-grid">
              <div className="stack">
                {section(
                  "Etapas do projeto",
                  <div className="phase-list">
                    {[
                      "Alinhamento concluído",
                      "Cobertura realizada",
                      "Seleção e tratamento",
                      "Entrega final",
                    ].map((s, i) => (
                      <div key={s}>
                        <span className={`phase-number ${i < 2 ? "done" : ""}`}>
                          {i < 2 ? (
                            <Check size={17} />
                          ) : (
                            String(i + 1).padStart(2, "0")
                          )}
                        </span>
                        <div>
                          <h3>{s}</h3>
                          <small>
                            {i < 2
                              ? "Concluído"
                              : i === 2
                                ? "Em execução · até 10 nov"
                                : "Prevista para 12 nov"}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>,
                )}
                {section(
                  isClient
                    ? "O que falta da sua parte"
                    : "Tarefas e pendências",
                  <div className="checklist">
                    {(isClient
                      ? ["Confirmar seleção das fotos para destaque"]
                      : [
                          "Confirmar cronograma com Clara",
                          "Realizar cobertura",
                          "Selecionar as 400 fotografias",
                          "Finalizar tratamento de cor",
                        ]
                    ).map((s, i) => (
                      <label key={s}>
                        <Checkbox
                          checked={isClient ? taskChecks[3] : taskChecks[i]}
                          onCheckedChange={(v) =>
                            setTaskChecks(
                              taskChecks.map((b, n) =>
                                n === (isClient ? 3 : i) ? !!v : b,
                              ),
                            )
                          }
                        />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>,
                )}
                {section(
                  "Arquivos compartilhados",
                  <FileRow onClick={() => go("pdf")} />,
                )}
              </div>
              <aside className="stack">
                {section(
                  "Últimos acontecimentos",
                  <Timeline
                    compact
                    client={isClient}
                    events={[
                      "Tratamento iniciado · Helena Duarte",
                      "Cobertura realizada · Helena Duarte",
                      "Contrato v2 assinado · Clara Martins",
                      "Cronograma confirmado · Clara Martins",
                    ]}
                  />,
                )}
                <Button
                  onClick={() => go(isClient ? "client-delivery" : "delivery")}
                >
                  {isClient ? "Ver entrega" : "Publicar entrega"}
                  <ArrowRight />
                </Button>
              </aside>
            </div>
          </>
        )}
      </>
    );
  } else if (screen === "delivery" || screen === "adjustment") {
    content = (
      <>
        {heading(
          screen === "adjustment"
            ? "Mais um cuidado na entrega."
            : "Seu trabalho está pronto para ser visto.",
          "Publique os arquivos com uma mensagem para Clara.",
          <Badge>
            {screen === "adjustment" ? "Aguardando ajuste" : "Em execução"}
          </Badge>,
        )}
        {projectTabs}
        {errorBanner}
        {successBanner}
        {screen === "adjustment" && (
          <Banner title="Pedido de ajuste · entrega 1" tone="warning">
            “Adorei as fotos! Você pode deixar os tons da cerimônia um pouco
            mais naturais?” · Clara, 14 nov
          </Banner>
        )}
        <form
          className="form-surface"
          onSubmit={(e) => {
            e.preventDefault();
            if (!files.length) {
              setState("Erro");
              toast.error("Selecione pelo menos um arquivo para publicar.");
              return;
            }
            save("Entrega publicada.");
            go("client-delivery");
          }}
        >
          <Field
            label="Título da entrega"
            value={
              screen === "adjustment"
                ? "Fotografias finais — revisão 2"
                : "Fotografias do casamento — entrega 1"
            }
            required
          />
          <Field
            label="Mensagem para o cliente"
            area
            value={
              screen === "adjustment"
                ? "Clara, ajustei os tons da cerimônia. Esta versão substitui a anterior. Espero que vocês gostem!"
                : "Clara e Miguel, foi uma alegria contar essa história. Aqui estão as fotografias selecionadas e tratadas."
            }
          />
          {upload}
          {empty && (
            <p className="small">
              Nenhum arquivo selecionado. Adicione os arquivos da entrega.
            </p>
          )}
          {fail && (
            <p className="field-error">
              Selecione ao menos um arquivo válido antes de publicar.
            </p>
          )}
          <Banner title="A entrega aparece no link do cliente.">
            Clara poderá solicitar um ajuste ou aprovar a entrega.
          </Banner>
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => go("execution")}
            >
              Voltar ao projeto
            </Button>
            <Button type="submit">
              Publicar {screen === "adjustment" ? "revisão" : "entrega"}
              <Send />
            </Button>
          </div>
        </form>
      </>
    );
  } else if (screen === "complete") {
    content = (
      <>
        {heading(
          "Um projeto bem concluído.",
          "O trabalho foi entregue. A história continua guardada.",
          <Badge>{complete || success ? "Concluído" : "Em execução"}</Badge>,
        )}
        <Banner title="Clara aprovou a entrega final." tone="success">
          Fotografias finais — revisão 2 · 19 nov, 14h32
        </Banner>
        {projectSummary}
        <div className="surface completion">
          <span className="round-icon">
            <Check />
          </span>
          <h2>
            {complete || success
              ? "Tudo entregue. Tudo registrado."
              : "Tudo pronto para concluir."}
          </h2>
          <p>
            Contrato, arquivos e histórico continuam disponíveis para vocês
            dois.
          </p>
          <Button
            onClick={() => {
              setComplete(true);
              save("Projeto concluído.");
            }}
            disabled={complete || success}
          >
            {complete || success ? "Projeto concluído" : "Concluir projeto"}
          </Button>
          <Button variant="ghost" onClick={() => go("history")}>
            Ver histórico
            <ArrowRight />
          </Button>
        </div>
      </>
    );
  } else if (screen === "history" || screen === "client-history") {
    content = (
      <>
        {heading(
          "A história do projeto.",
          "Cada decisão, versão e entrega, no mesmo lugar.",
        )}
        {!isClient && projectTabs}
        {empty ? (
          <Blank
            title="O primeiro registro vem com o primeiro passo."
            description="As ações compartilhadas do projeto aparecerão aqui."
          />
        ) : (
          <div className="history-layout">
            <section className="surface">
              <h2>{title}</h2>
              <Timeline client={isClient} />
            </section>
            <section className="surface">
              <h2>Avisos do projeto</h2>
              <Banner title="Projeto concluído." tone="success">
                A entrega final foi aprovada em 19 de novembro.
              </Banner>
              <FileRow onClick={() => go("pdf")} />
              <p className="small">
                {isClient
                  ? "Você vê somente os eventos compartilhados com você."
                  : "O cliente não vê notas internas ou mudanças de visibilidade."}
              </p>
            </section>
          </div>
        )}
      </>
    );
  } else if (screen === "notifications") {
    content = (
      <>
        {heading(
          "O que merece sua atenção.",
          "Decisões e novidades dos seus projetos.",
          <Button
            variant="outline"
            onClick={() => {
              setNoticeRead(true);
              toast.success("Avisos marcados como lidos.");
            }}
          >
            Marcar como lidos
            <Check />
          </Button>,
        )}
        {empty ? (
          <Blank
            title="Tudo em dia por aqui."
            description="Novidades dos seus projetos aparecerão nesta lista."
          />
        ) : (
          <section className="surface notifications">
            {[
              [
                "Clara aprovou a entrega final.",
                "Casamento Clara & Miguel · há 20 minutos",
                "complete",
              ],
              [
                "Marina pediu uma alteração.",
                "Retratos para um novo ciclo · há 2 horas",
                "revision",
              ],
              [
                "Ateliê Aurora visualizou o projeto.",
                "Campanha Coleção Origens · ontem",
                "share",
              ],
            ].map(([t, d, n]) => (
              <button
                key={t}
                onClick={() => go(n)}
                className={noticeRead ? "read" : ""}
              >
                <span className="round-icon">
                  <Bell size={20} />
                </span>
                <span>
                  <strong>{t}</strong>
                  <small>{d}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </section>
        )}
      </>
    );
  } else if (screen === "invalid-link") {
    content = (
      <div className="invalid-link">
        <span className="round-icon">
          <LinkIcon />
        </span>
        <h1>Este link não está disponível.</h1>
        <p>
          Ele pode estar incompleto ou ter sido desativado. Peça um novo link à
          pessoa que compartilhou o projeto com você.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            toast.info(
              "Se o link continuar indisponível, solicite um novo à profissional.",
            );
          }}
        >
          Tentar novamente
        </Button>
        <small>Nenhum dado do projeto foi exibido.</small>
      </div>
    );
  } else if (screen === "client-review") {
    content = (
      <>
        {clientIntro}
        {errorBanner}
        <Banner title="Um convite para criar essa história juntos.">
          Confira o projeto e o contrato. Se precisar mudar algo, peça uma
          alteração antes de assinar.
        </Banner>
        {projectSummary}
        <div className="client-content-grid">
          <div className="stack">
            {clientBlocks}
            {section(
              "O combinado, por escrito",
              <>
                <FileRow onClick={() => go("pdf")} />
                <Button variant="outline" onClick={() => go("pdf")}>
                  Ler contrato
                  <FileText />
                </Button>
              </>,
            )}
          </div>
          <aside className="surface client-decision">
            <span className="eyebrow">SEU PRÓXIMO PASSO</span>
            <h2>Podemos começar?</h2>
            <p>
              Ao assinar, você confirma o escopo, os prazos e o valor do
              contrato v{version}.
            </p>
            <Button className="full" onClick={() => go("client-sign")}>
              Revisar e assinar
              <ArrowRight />
            </Button>
            <Button
              variant="outline"
              className="full"
              onClick={() => go("client-change")}
            >
              Solicitar alteração
            </Button>
            <Button
              variant="ghost"
              className="full danger-text"
              onClick={() => go("client-refuse")}
            >
              Recusar projeto
            </Button>
            <small>
              <Lock size={14} /> Sem criar uma conta.
            </small>
          </aside>
        </div>
      </>
    );
  } else if (["client-change", "client-adjust"].includes(screen)) {
    const adjust = screen === "client-adjust";
    content = (
      <>
        {heading(
          adjust ? "O que precisa de um ajuste?" : "Vamos alinhar os detalhes.",
          adjust
            ? "Conte o que deve mudar na entrega publicada."
            : "Sua solicitação chega à Helena junto do projeto.",
        )}
        {errorBanner}
        {success ? (
          <div className="surface completion">
            <span className="round-icon">
              <Check />
            </span>
            <h2>
              {adjust ? "Pedido de ajuste enviado." : "Alteração solicitada."}
            </h2>
            <p>
              Helena foi avisada neste projeto. Você poderá acompanhar a
              resposta pelo mesmo link.
            </p>
            <Badge>
              {adjust ? "Aguardando ajuste" : "Alteração solicitada"}
            </Badge>
            <Button
              onClick={() => go(adjust ? "client-progress" : "client-review")}
            >
              Voltar ao projeto
              <ArrowRight />
            </Button>
          </div>
        ) : (
          <form
            className="form-surface"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 10) {
                setState("Erro");
                return;
              }
              save(
                adjust
                  ? "Pedido de ajuste registrado."
                  : "Alteração solicitada.",
              );
            }}
          >
            <div className="context-card">
              <FileText size={22} />
              <span>
                <strong>
                  {adjust ? "Fotografias finais — entrega 1" : title}
                </strong>
                <small>
                  {adjust
                    ? "Publicada em 12 nov, 2026"
                    : `Contrato · versão ${version}`}
                </small>
              </span>
            </div>
            <Field
              label={
                adjust ? "Descreva o ajuste" : "O que você gostaria de alterar?"
              }
              area
              value={reason}
              onChange={setReason}
              placeholder={
                adjust
                  ? "Ex.: Prefiro tons mais naturais nas fotos da cerimônia."
                  : "Ex.: Podemos começar a cobertura às 14h?"
              }
              required
              error={
                fail
                  ? "Descreva seu pedido com pelo menos 10 caracteres."
                  : undefined
              }
            />
            <p className="small">
              {adjust
                ? "O pedido fica relacionado a esta entrega e registrado no histórico."
                : "O projeto ainda não será assinado. Você revisará a nova versão antes de decidir."}
            </p>
            <div className="form-actions">
              <Button
                variant="outline"
                type="button"
                onClick={() => go(adjust ? "client-delivery" : "client-review")}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Enviar solicitação
                <Send />
              </Button>
            </div>
          </form>
        )}
      </>
    );
  } else if (screen === "client-refuse") {
    content = (
      <>
        {heading(
          "Prefere não seguir com o projeto?",
          "Tudo bem. Confirme sua decisão abaixo.",
        )}
        {errorBanner}
        {success ? (
          <div className="surface completion">
            <Badge>Recusado</Badge>
            <h2>Sua decisão foi registrada.</h2>
            <p>
              Helena poderá consultar a recusa no histórico. Nenhum contrato foi
              assinado.
            </p>
            <Button variant="outline" onClick={() => go("client-history")}>
              Ver histórico
            </Button>
          </div>
        ) : (
          <form
            className="form-surface"
            onSubmit={(e) => {
              e.preventDefault();
              if (!agreed) {
                setState("Erro");
                return;
              }
              save("Recusa registrada.");
            }}
          >
            <Banner
              title="Esta ação encerra a revisão desta proposta."
              tone="warning"
            >
              Se quiser mudar o escopo ou o prazo, você também pode solicitar
              uma alteração.
            </Banner>
            <Field
              label="Quer contar o motivo? (opcional)"
              area
              value={reason}
              onChange={setReason}
              placeholder="O que pesou na sua decisão?"
            />
            <label className="check-label">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(!!v)}
              />
              Quero recusar esta versão do projeto.
            </label>
            <div className="form-actions">
              <Button
                variant="outline"
                type="button"
                onClick={() => go("client-review")}
              >
                Voltar e revisar
              </Button>
              <Button variant="destructive" type="submit">
                Confirmar recusa
              </Button>
            </div>
          </form>
        )}
      </>
    );
  } else if (screen === "client-sign") {
    content = (
      <>
        {heading(
          "Uma assinatura. Um combinado.",
          "Confira a versão do contrato antes de confirmar.",
        )}
        {errorBanner}
        {success || signed ? (
          <div className="surface completion">
            <span className="round-icon">
              <ShieldCheck />
            </span>
            <Badge>Assinado</Badge>
            <h2>Agora está combinado.</h2>
            <p>
              Clara Martins · Contrato v{version} · 22 set, 2026 às 14h32.
              <br />
              Recibo demonstrativo. Nenhuma assinatura real foi realizada.
            </p>
            <FileRow onClick={() => go("pdf")} />
            <Button onClick={() => go("client-progress")}>
              Acompanhar projeto
              <ArrowRight />
            </Button>
          </div>
        ) : (
          <div className="sign-layout">
            <ContractPaper name={title} scope={scope} version={version} />
            <form
              className="surface sign-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!agreed || !clientName.trim() || !email.includes("@")) {
                  setState("Erro");
                  return;
                }
                setSigned(true);
                save("Assinatura demonstrativa registrada.");
              }}
            >
              <h2>Confirme que é você.</h2>
              <Field
                label="Nome completo"
                value={clientName}
                onChange={setClientName}
                required
              />
              <Field
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                required
              />
              <label className="check-label">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(!!v)}
                />
                <span>
                  Li e concordo com o escopo, o valor e as condições do contrato{" "}
                  <strong>versão {version}</strong>.
                </span>
              </label>
              <p className="small">
                Assinatura simples, sem certificado digital. Este protótipo não
                coleta assinatura válida.
              </p>
              <Button className="full" disabled={!agreed} type="submit">
                Assinar contrato v{version}
                <Pencil />
              </Button>
              {!agreed && (
                <small>
                  Leia o contrato e marque a concordância para continuar.
                </small>
              )}
            </form>
          </div>
        )}
      </>
    );
  } else if (screen === "client-delivery") {
    content = (
      <>
        {clientIntro}
        {errorBanner}
        {empty ? (
          <Blank
            title="Sua entrega está sendo preparada."
            description="Você verá os arquivos aqui assim que Helena publicar a entrega."
          />
        ) : (
          <>
            <Banner title="Tem uma entrega esperando por você.">
              Confira os arquivos abaixo. Depois, aprove a entrega ou solicite
              um ajuste.
            </Banner>
            <section className="surface delivery-review">
              <span className="eyebrow">ENTREGA 01 · 12 NOV, 2026</span>
              <h2>Um dia inteiro, para guardar.</h2>
              <p>
                Clara e Miguel, foi uma alegria contar essa história. Aqui estão
                as fotografias selecionadas e tratadas. Espero que elas façam
                vocês reviver cada detalhe.
              </p>
              <div className="delivery-signature">
                <Avatar />
                <strong>Helena Duarte</strong>
              </div>
              <FileRow
                name={files[0] || "Clara-e-Miguel — fotografias.zip"}
                meta="ZIP · 400 fotografias · arquivo demonstrativo"
                onClick={() =>
                  toast.info(
                    "Anexo demonstrativo. Nenhum arquivo real foi enviado nesta apresentação.",
                  )
                }
              />
              <p className="small">
                Uma rodada de ajustes incluída. Envie seu pedido até 19 de
                novembro.
              </p>
              <div className="form-actions">
                <Button variant="outline" onClick={() => go("client-adjust")}>
                  Solicitar ajuste
                </Button>
                <Button onClick={() => go("client-approve")}>
                  Aprovar entrega
                  <Check />
                </Button>
              </div>
            </section>
          </>
        )}
      </>
    );
  } else if (screen === "client-approve") {
    content = (
      <>
        {heading(
          "Podemos fechar essa história?",
          "Confira a entrega final e confirme sua aprovação.",
        )}
        {errorBanner}
        {success || complete ? (
          <div className="surface completion">
            <span className="round-icon">
              <Check />
            </span>
            <Badge>Concluído</Badge>
            <h2>Foi um prazer criar com você.</h2>
            <p>
              A entrega foi aprovada e o projeto está concluído. Arquivos,
              contrato e histórico continuam neste link.
            </p>
            <Button variant="outline" onClick={() => go("client-history")}>
              Ver histórico do projeto
            </Button>
          </div>
        ) : (
          <section className="form-surface">
            <FileRow
              name="Fotografias finais — revisão 2.zip"
              meta="Entrega final · 18 nov, 2026"
            />
            <label className="check-label">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(!!v)}
              />
              <span>
                Conferi os arquivos e aprovo a entrega final deste projeto.
              </span>
            </label>
            <Banner title="Seu aceite fica no histórico.">
              Ao confirmar, a entrega será aprovada e o projeto concluído.
            </Banner>
            <div className="form-actions">
              <Button variant="outline" onClick={() => go("client-delivery")}>
                Revisar entrega
              </Button>
              <Button
                disabled={!agreed}
                onClick={() => {
                  setComplete(true);
                  save("Entrega aprovada. Projeto concluído.");
                }}
              >
                Aprovar e concluir
                <Check />
              </Button>
            </div>
          </section>
        )}
      </>
    );
  } else content = <Blank />;
  if (auth) return <div className="product auth-product">{content}</div>;
  if (isClient)
    return (
      <div className="product client-product">
        <header className="client-header">
          <Logo />
          {screen !== "invalid-link" && (
            <span>
              Um projeto de <strong>{profileName}</strong>
            </span>
          )}
          {screen !== "invalid-link" && (
            <Button variant="ghost" onClick={() => go("client-history")}>
              <Clock size={18} />
              <span>Histórico</span>
            </Button>
          )}
        </header>
        <main className="client-main">
          {screen !== "client-review" && screen !== "invalid-link" && (
            <button
              className="back-link"
              onClick={() => go(signed ? "client-progress" : "client-review")}
            >
              <ArrowLeft size={16} />
              Voltar ao projeto
            </button>
          )}
          {content}
        </main>
        <footer className="client-footer">
          <Logo />
          <span>Seu projeto. Seus combinados. Tudo aqui.</span>
          <small>Protótipo demonstrativo</small>
        </footer>
      </div>
    );
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "224px" } as React.CSSProperties}
      className="product pro-product"
    >
      <Sidebar className="pro-sidebar">
        <SidebarHeader>
          <Logo />
          <div className="workspace-label">
            HELENA DUARTE <span>ESTÚDIO</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <NavItem
              id="projects"
              label="Projetos"
              icon={<Folder />}
              active={
                ![
                  "clients",
                  "client-new",
                  "client-edit",
                  "profile",
                  "notifications",
                ].includes(screen)
              }
              go={go}
            />
            <NavItem
              id="clients"
              label="Clientes"
              icon={<Users />}
              active={["clients", "client-new", "client-edit"].includes(screen)}
              go={go}
            />
            <NavItem
              id="notifications"
              label="Avisos"
              icon={<Bell />}
              active={screen === "notifications"}
              go={go}
            />
          </SidebarMenu>
          <div className="sidebar-bottom-note">
            <span className="eyebrow">DO ACORDO À ENTREGA</span>
            <p>
              Mais clareza.
              <br />
              Mais espaço para criar.
            </p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <Button
            variant="ghost"
            className="profile-nav"
            onClick={() => go("profile")}
          >
            <Avatar name={profileName} />
            <span>
              {profileName}
              <small>Seu perfil profissional</small>
            </span>
            <Settings size={16} />
          </Button>
        </SidebarFooter>
      </Sidebar>
      <div className="pro-body">
        <header className="pro-topbar">
          <SidebarTrigger aria-label="Abrir navegação" />
          <nav aria-label="Caminho da página">
            <button onClick={() => go("projects")}>Seu espaço</button>
            <ChevronRight size={14} />
            <span>{meta?.name.split(" · ")[1]}</span>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir avisos"
            onClick={() => go("notifications")}
          >
            <Bell size={19} />
          </Button>
        </header>
        <main className="pro-main">{content}</main>
        <footer className="pro-footer">
          <span>PJ Suite · O trabalho criativo, bem cuidado.</span>
          <small>Protótipo demonstrativo</small>
        </footer>
      </div>
    </SidebarProvider>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={17} className="project-arrow" />;
}

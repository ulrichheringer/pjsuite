# PJ Suite — especificações das 34 telas

Todas as telas têm versão responsiva desktop e mobile no catálogo. Use o seletor de estado para inspecionar variações. Estados são cenários demonstrativos, sem persistência ou serviços reais.

## 01 · Login

- ID: `login`
- Área: Conta.
- Propósito: Entrar no espaço de trabalho com e-mail e senha.
- Estados: Padrão, Erro, Carregando, Sucesso.
- Componentes: Logo, input, botão, banner.
- Fora desta tela: Login social e autenticação real.
- Mobile: Painel editorial removido; formulário em uma coluna, marca acima.
- Próximo passo: `projects`.

## 02 · Cadastro

- ID: `signup`
- Área: Conta.
- Propósito: Criar a conta do profissional.
- Estados: Padrão, Erro, Carregando, Sucesso.
- Componentes: Formulário, checkbox, feedback inline.
- Fora desta tela: Planos e cobrança.
- Mobile: Painel editorial removido; formulário em uma coluna, marca acima.
- Próximo passo: `profile`.

## 03 · Perfil profissional

- ID: `profile`
- Área: Conta.
- Propósito: Definir a identidade que será apresentada ao cliente.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Avatar, formulário, select, upload.
- Fora desta tela: Perfil público em marketplace.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `clients`.

## 04 · Clientes

- ID: `clients`
- Área: Clientes.
- Propósito: Acompanhar relações, propostas e projetos ativos em um quadro visual.
- Estados: Padrão, Vazio, Erro, Carregando.
- Componentes: Kanban responsivo, resumo, busca, avatar, menu.
- Fora desta tela: Automação comercial, leads e analytics de vendas.
- Mobile: Colunas do quadro têm rolagem horizontal e cartões completos.
- Próximo passo: `client-new`.

## 05 · Criar cliente

- ID: `client-new`
- Área: Clientes.
- Propósito: Cadastrar dados para identificar o cliente no projeto.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Inputs, select, botão.
- Fora desta tela: Convites e cadastro obrigatório do cliente.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `project-new`.

## 06 · Editar cliente

- ID: `client-edit`
- Área: Clientes.
- Propósito: Atualizar contato e identificação de um cliente.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Formulário, confirmação de saída.
- Fora desta tela: Alterar dados de contratos já assinados.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `clients`.

## 07 · Arquivar cliente

- ID: `client-archive`
- Área: Clientes.
- Propósito: Confirmar o arquivamento sem apagar seu histórico.
- Estados: Padrão, Sucesso.
- Componentes: Alert dialog, ação secundária.
- Fora desta tela: Exclusão permanente.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `clients`.

## 08 · Projetos

- ID: `projects`
- Área: Projetos.
- Propósito: Organizar projetos ativos e arquivados por estado.
- Estados: Padrão, Vazio, Erro, Carregando.
- Componentes: Tabs, busca, card, badge.
- Fora desta tela: Dashboard financeiro e analytics.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `project-new`.

## 09 · Criar projeto

- ID: `project-new`
- Área: Projetos.
- Propósito: Dar contexto ao projeto e escolher uma estrutura inicial flexível.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Formulário, select, escolha de estrutura, fluxo de configuração.
- Fora desta tela: Marketplace de templates.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `builder`.

## 10 · Editar projeto

- ID: `project-edit`
- Área: Projetos.
- Propósito: Ajustar dados gerais antes de gerar o contrato.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Formulário, banner de versão.
- Fora desta tela: Edição silenciosa de contrato assinado.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `builder`.

## 11 · Duplicar projeto

- ID: `duplicate`
- Área: Projetos.
- Propósito: Reutilizar o escopo em um novo rascunho.
- Estados: Padrão, Sucesso.
- Componentes: Modal, input, select.
- Fora desta tela: Copiar assinatura, link e histórico.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `builder`.

## 12 · Arquivar projeto

- ID: `project-archive`
- Área: Projetos.
- Propósito: Tirar o projeto da lista ativa mantendo seus registros.
- Estados: Padrão, Sucesso.
- Componentes: Alert dialog, badge.
- Fora desta tela: Apagar arquivos ou contratos.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `projects`.

## 13 · Montagem do projeto

- ID: `builder`
- Área: Acordo.
- Propósito: Definir escopo, etapas, tarefas, entregáveis, prazos, preço, responsabilidades e anexos.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Etapas configuráveis, modal, prazos flexíveis, sliders, plano de pagamento, upload.
- Fora desta tela: Gantt, galeria, cobrança e cálculo automático de progresso.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `visibility`.

## 14 · Visibilidade e preview

- ID: `visibility`
- Área: Acordo.
- Propósito: Escolher os blocos visíveis e conferir a experiência do cliente.
- Estados: Padrão, Sucesso.
- Componentes: Switch, preview dividido.
- Fora desta tela: Ocultar identificação ou termos do contrato.
- Mobile: Controles acima, preview abaixo; switches continuam com rótulos.
- Próximo passo: `contract`.

## 15 · Finalizar e gerar contrato

- ID: `contract`
- Área: Acordo.
- Propósito: Conferir a versão, finalizar o projeto e visualizar o contrato.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Resumo, documento, botão.
- Fora desta tela: Assessoria jurídica e ICP-Brasil.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `pdf`.

## 16 · Preview / baixar PDF

- ID: `pdf`
- Área: Acordo.
- Propósito: Ler a versão final do contrato e imprimir ou salvar em PDF.
- Estados: Padrão, Erro.
- Componentes: Folha de contrato, toolbar.
- Fora desta tela: Editor de cláusulas jurídicas.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `share`.

## 17 · Compartilhar

- ID: `share`
- Área: Acordo.
- Propósito: Gerar e copiar o link de revisão, acompanhando sua visualização.
- Estados: Padrão, Visto, Erro, Sucesso.
- Componentes: Bloco de link, banner, timeline.
- Fora desta tela: Envio automático de e-mail ou WhatsApp.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `client-review`.

## 18 · Ajustar e reenviar

- ID: `revision`
- Área: Acordo.
- Propósito: Ler a alteração solicitada, revisar o escopo e compartilhar a nova versão.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Banner, textarea, versionamento.
- Fora desta tela: Chat em tempo real.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `client-sign`.

## 19 · Execução

- ID: `execution`
- Área: Acompanhamento.
- Propósito: Acompanhar etapas, tarefas, prazos, arquivos e pendências após a assinatura.
- Estados: Padrão, Vazio, Erro.
- Componentes: Checklist, etapas, timeline, arquivo.
- Fora desta tela: Gantt e percentual automático de avanço.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `delivery`.

## 20 · Publicar entrega

- ID: `delivery`
- Área: Acompanhamento.
- Propósito: Enviar a entrega com descrição e arquivos para aprovação.
- Estados: Padrão, Vazio, Erro, Sucesso.
- Componentes: Upload, textarea, checklist.
- Fora desta tela: DAM e galeria pesada.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `client-delivery`.

## 21 · Pedido de ajuste

- ID: `adjustment`
- Área: Acompanhamento.
- Propósito: Conferir o pedido do cliente e publicar a entrega revisada.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Banner, upload, histórico de entrega.
- Fora desta tela: Comentários em tempo real sobre cada foto.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `client-delivery`.

## 22 · Conclusão

- ID: `complete`
- Área: Acompanhamento.
- Propósito: Conferir a aprovação e concluir o projeto.
- Estados: Padrão, Sucesso.
- Componentes: Resumo, badge, confirmação.
- Fora desta tela: Cobrança e pesquisa de satisfação.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `history`.

## 23 · Histórico do projeto

- ID: `history`
- Área: Acompanhamento.
- Propósito: Consultar decisões, versões e entregas com autoria e data.
- Estados: Padrão, Vazio.
- Componentes: Timeline, filtros.
- Fora desta tela: Logs técnicos e notas internas no portal.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `notifications`.

## 24 · Avisos do profissional

- ID: `notifications`
- Área: Acompanhamento.
- Propósito: Localizar eventos que precisam de atenção.
- Estados: Padrão, Vazio.
- Componentes: Lista de avisos, badge, ações.
- Fora desta tela: Push e chat.
- Mobile: Navegação em drawer; colunas empilhadas e ações com largura total.
- Próximo passo: `client-review`.

## 25 · Revisar projeto

- ID: `client-review`
- Área: Portal do cliente.
- Propósito: Ler a proposta e o contrato, respeitando a visibilidade dos blocos.
- Estados: Padrão, Carregando, Erro.
- Componentes: Perfil, resumo, seções, ações de decisão.
- Fora desta tela: Conta do cliente e dados internos.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `client-change`.

## 26 · Solicitar alteração

- ID: `client-change`
- Área: Portal do cliente.
- Propósito: Explicar o que deve mudar antes da assinatura.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Formulário, resumo, banner.
- Fora desta tela: Alterar o contrato diretamente.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `revision`.

## 27 · Recusar projeto

- ID: `client-refuse`
- Área: Portal do cliente.
- Propósito: Registrar a decisão com confirmação e motivo opcional.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Confirmação, textarea, botão destrutivo.
- Fora desta tela: Apagar o projeto ou seu histórico.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `client-history`.

## 28 · Assinar

- ID: `client-sign`
- Área: Portal do cliente.
- Propósito: Confirmar identidade e concordância com uma versão específica.
- Estados: Padrão, Erro, Carregando, Sucesso.
- Componentes: Preview, nome, e-mail, checkbox, recibo.
- Fora desta tela: ICP-Brasil, certificado e assinatura real neste protótipo.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `client-progress`.

## 29 · Acompanhar projeto

- ID: `client-progress`
- Área: Portal do cliente.
- Propósito: Consultar etapas visíveis, pendências, arquivos e avisos.
- Estados: Padrão, Vazio, Erro.
- Componentes: Etapas, banner, timeline, arquivo.
- Fora desta tela: Tarefas internas e push.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `client-delivery`.

## 30 · Ver entrega

- ID: `client-delivery`
- Área: Portal do cliente.
- Propósito: Revisar os arquivos e decidir entre ajuste e aprovação.
- Estados: Padrão, Vazio, Erro.
- Componentes: Lista de arquivos, resumo, ações.
- Fora desta tela: Galeria de assets e edição de imagem.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `client-adjust`.

## 31 · Solicitar ajuste

- ID: `client-adjust`
- Área: Portal do cliente.
- Propósito: Descrever um ajuste relacionado à entrega publicada.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Textarea, referência à entrega, banner.
- Fora desta tela: Mudança de preço ou escopo contratado.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `adjustment`.

## 32 · Aprovar e concluir

- ID: `client-approve`
- Área: Portal do cliente.
- Propósito: Confirmar aprovação da entrega final e conclusão.
- Estados: Padrão, Erro, Sucesso.
- Componentes: Checkbox, confirmação, recibo.
- Fora desta tela: Pagamento e avaliação pública.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.
- Próximo passo: `client-history`.

## 33 · Histórico e avisos

- ID: `client-history`
- Área: Portal do cliente.
- Propósito: Consultar os eventos compartilhados do projeto no mesmo link.
- Estados: Padrão, Vazio.
- Componentes: Timeline, avisos.
- Fora desta tela: Eventos internos e notificações push.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.

## 34 · Link inválido

- ID: `invalid-link`
- Área: Portal do cliente.
- Propósito: Explicar que o link não está disponível e indicar como obter outro.
- Estados: Padrão.
- Componentes: Empty state de erro.
- Fora desta tela: Expor identidade ou detalhes do projeto.
- Mobile: Leitura em uma coluna; ações com largura total; cabeçalho compacto.

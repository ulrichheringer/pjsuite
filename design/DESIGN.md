# PJ Suite — identidade e produto

Entrega de design em React. Identidade, componentes, 34 telas nomeadas, variações responsivas, estados de fluxo, storyboard e especificações. Dados inteiramente fictícios.

## Como explorar

- Abra a aplicação e percorra A. Identidade → B. Componentes → C. Telas → Storyboard → Tokens & specs.
- Em Telas, selecione um cenário na navegação, alterne Desktop/Mobile e escolha o estado (erro, sucesso, vazio, carregando etc.).
- O botão de abrir em tamanho real remove a moldura da apresentação. O produto usa o mesmo código responsivo em ambos os formatos.
- Os botões dentro do produto conectam o fluxo. Cada cenário do catálogo reinicia seus dados demonstrativos.
- O storyboard conecta os 11 momentos pedidos, com o ciclo completo de ajustes de entrega expandido.
- A tela de contrato permite imprimir/salvar PDF pelo navegador. Anexos de exemplo não contêm arquivos reais.

## Direção original

Tinta, papel e cobre: uma interface que trata o trabalho criativo como autoral e o acordo como preciso. DM Serif Display dá ritmo editorial; Manrope mantém legibilidade nos controles. O monograma foi desenhado em SVG para esta entrega.

Referências examinadas, sem incorporar seus pixels ou elementos:

- `pasted-1789926362763-0.png`: leveza e hierarquia clara. Não reutilizamos composição de hero, verde neon, gradiente, logo ou ilustração.
- `pasted-1789926381337-0.png`: ritmo e espaço entre blocos. Não reutilizamos o layout de perguntas, ícone de expansão ou copy.
- `pasted-1789926416201-0.png`: separação de superfícies operacionais. Não importamos gráficos, métricas ou grid de dashboard.
- `pasted-1789926488904-0.png`: densidade operacional e categorização. Não importamos kanban, navegação, cores ou funcionalidades fora do escopo.

Light mode é a experiência desta edição: projeto, contrato e PDF preservam a referência de papel. A marca branca sobre tinta é uma aplicação de identidade, não um tema escuro incompleto.

## Arquivos para implementação

- `app/catalog.ts`: inventário das 34 telas, propósito, estados, componentes, exclusões e próximo passo. É a fonte da especificação exibida no catálogo.
- `app/ui.tsx`: componentes compartilhados e wrappers de controles acessíveis.
- `components/ui`: primitivas Radix do starter, compostas e tematizadas na aplicação.
- `app/product.tsx`: experiências profissional/cliente e estado demonstrativo.
- `app/boards.tsx`: sistema de componentes, storyboard e tabela de tokens.
- `app/globals.css`, `app/product.css`, `app/studio.css`: fundações, produto e moldura da apresentação.
- `public/brand`: wordmarks claro/escuro e monograma SVG. Wordmarks usam texto vivo em Manrope com fallback Arial; instalar a fonte para reproduzir a marca em ferramentas de edição.
- `public/tokens.json`: tokens de engenharia exportáveis.
- `SCREEN-SPECS.md`: especificação por tela em Markdown.

## Regras de produto representadas

- Profissional opera o app; cliente revisa e acompanha por link, sem conta pesada.
- Visibilidade por bloco se aplica ao preview. Identificação e contrato permanecem acessíveis.
- Tarefas internas ficam ocultas por padrão. Histórico do cliente contém apenas eventos compartilhados.
- Alteração antes da assinatura e ajuste de uma entrega são momentos diferentes.
- Versões do contrato são explícitas. Uma atualização operacional não reescreve um contrato assinado.
- Recusa e assinatura têm decisão explícita, erro e recibo de sucesso.
- Arquivar preserva histórico. Duplicar inicia um rascunho sem assinatura/link/histórico.

## Limites do protótipo

Não há backend, autenticação real, transmissão de arquivos, assinatura válida, envio de mensagens nem persistência entre sessões. O estado é local e temporário. O link gerado abre a demonstração, não publica dados personalizados. O indicador de visualização é um cenário de design, não rastreamento real.

O contrato contém texto ilustrativo para avaliar hierarquia e leitura; não é uma minuta jurídica de produção. O PDF usa a impressão do navegador. Downloads de anexos fictícios explicam que são exemplos.

Não inclui marketplace, login social, chat, Gantt, DAM, app nativo, ICP-Brasil ou analytics de marketing.

## Verificação

`npx tsc --noEmit` verifica a tipagem. `node scripts/check-design.mjs` renderiza as telas e seus estados, confere integridade do catálogo, isolamento básico do portal e contraste dos pares semânticos. O build é feito pelo script padrão do projeto.

A validação automatizada não substitui inspeção visual no navegador, teste completo de teclado ou auditoria WCAG. A entrega não foi submetida a esses testes de navegador nesta rodada.

## Rodar localmente

`npm ci` e `npm run dev`. A apresentação usa fontes Google Fonts; Georgia e Arial são os fallbacks locais. O projeto é compatível com React 19 e usa Vinext/Vite.

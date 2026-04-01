# Requisitos do projeto — Template, Transcrição, HUs, Estimativa e Escopo

Documento único de requisitos: HUs do produto + papel das **transcrições** (adaptado do Doc Hub) + referências ao reuso de frontend.

---

## Papel das transcrições no projeto

A **transcrição** é a base de entrada do projeto: áudio ou texto que vira conteúdo estruturado e alimenta template, HUs e escopo.

- **HU 3 / HU 4:** Upload de áudio ou texto → geração automática de transcrição (STT quando for áudio).
- **Fluxo:** Transcrição → usado em **HU 2** (preencher template), **HU 5** (identificar HUs), **HU 6** (gerar HUs), **HU 12** (definir escopo).
- **Reuso Doc Hub:** Adaptar o conceito de “contexto/transcrição” do Doc Hub: mesma ideia de upload, armazenamento, exibição e vinculação a um “projeto”. No novo sistema, **transcrição pertence a um projeto** (1 projeto N transcrições). Reutilizar:
  - Padrão de **upload** (arquivo + metadados), **listagem** e **detalhe** (sidebar + tabs + conteúdo em markdown).
  - Serviço HTTP (estilo `transcription.service`) para: upload áudio/texto, iniciar/consultar job de transcrição automática, listar transcrições do projeto.
  - UI: mesmo layout de página de detalhe (header + sidebar “Informações/Ações” + tabs + Card com `.prose` para texto).

---

## Histórias de usuário (HUs)

### Template

| ID | Nome | Objetivo | Reuso frontend |
|----|------|----------|----------------|
| **HU 1** | Template – Upload e gestão de template padrão | Permitir upload de template específico para ser usado como base na geração automática de documentos. | Card para listar templates; modal de upload (padrão CreateTranscriptionModal); botões primary/outline; tabela ou grid de itens com ações (editar/remover). |
| **HU 2** | Template – Preenchimento automático via IA | Completar automaticamente o conteúdo faltante do template com base na transcrição/HUs. | Botão “Completar com IA” (estilo “Gerar Resumo/HU” do Doc Hub); loading no Button; resultado em área .prose (react-markdown); toast de sucesso/erro. |

### Transcrição (essencial no contexto do projeto)

| ID | Nome | Objetivo | Reuso frontend |
|----|------|----------|----------------|
| **HU 3** | Transcrição – Upload de áudio ou texto | Permitir envio de áudio ou texto para servir como base do projeto. | Adaptar fluxo do Doc Hub: upload em modal ou página de projeto; lista de arquivos anexados (como em TranscriptionPage); Input + botão de envio; progress/loading durante upload. |
| **HU 4** | Transcrição – Gerar transcrição automática de áudio | Converter áudio enviado em texto estruturado para posterior análise. | Botão “Gerar transcrição” (como “Gerar Resumo”); estado loading; exibição do texto gerado em Card + .prose; opcional: select de “engine” (pipeline/model/gemini) como na TranscriptionPage. |

### Requisitos (HUs sugeridas e geração)

| ID | Nome | Objetivo | Reuso frontend |
|----|------|----------|----------------|
| **HU 5** | Requisitos – Identificar automaticamente HUs necessárias | Analisar transcrição e sugerir quantas HUs precisam ser criadas. | Card de estatística (número de HUs sugeridas); possível lista resumida; mesmo padrão de “Gerar” + loading + resultado em área de conteúdo. |
| **HU 6** | Requisitos – Gerar histórias de usuário automaticamente | Criar HUs estruturadas com base na transcrição e regras definidas. | Tabs (Contexto, HU, Resumo, etc.) como TranscriptionPage; conteúdo de cada HU em .prose (react-markdown); botões Gerar/Regerar; export (md/doc/pdf) como utils/export. |

### Estimativa (complexidade e pontos)

| ID | Nome | Objetivo | Reuso frontend |
|----|------|----------|----------------|
| **HU 7** | Estimativa – Classificar HU por complexidade | Permitir definir complexidade (baixa, média, alta) por HU. | Select ou radio por HU (baixa/média/alta); Card por HU na listagem; badges de cor por complexidade (ex.: success/warning/error ou primary). |
| **HU 8** | Estimativa – Tabela de pontos por complexidade | Manter tabela configurável de pontos por nível de complexidade. | Tabela em .prose ou componente de tabela; inputs por linha (baixa, média, alta); pode ficar em configuração do projeto ou tela Admin; Button salvar + toast. |
| **HU 9** | Estimativa – Calcular horas por HU (De-Para pontos → horas) | Converter pontos/complexidade em horas estimadas. | Exibir “horas” ao lado de cada HU ou em coluna na lista; possível card de totais (horas totais); reutilizar estilo de cards de estatística do Dashboard. |

### Planejamento

| ID | Nome | Objetivo | Reuso frontend |
|----|------|----------|----------------|
| **HU 10** | Planejamento – Gerar cronograma automático do projeto | Gerar cronograma baseado em horas totais estimadas. | Uma tab ou seção “Cronograma”; conteúdo gerado em .prose ou componente de timeline; botão “Gerar cronograma”; mesmo padrão de loading e resultado. |

### Consolidação e escopo

| ID | Nome | Objetivo | Reuso frontend |
|----|------|----------|----------------|
| **HU 11** | Consolidação – Leitura consolidada de todas as HUs | Permitir visualizar todas as HUs do projeto em modo consolidado. | Uma tab “Todas as HUs” ou página “Consolidado”; lista ou accordion de HUs; cada bloco em .prose (react-markdown); scroll e custom-scrollbar. |
| **HU 12** | Escopo – Definir escopo final do projeto automaticamente | A partir das HUs + transcrição, consolidar e definir o escopo final do projeto. | Botão “Definir escopo”; resultado em Card + .prose; opção de export (md/pdf/doc); mesmo padrão de geração com IA (loading, toast, possível regeração). |

---

## Fluxo sugerido (ordem das HUs no uso)

1. **Projeto** criado (nome, descrição).
2. **HU 1** – Upload/gestão do **template** padrão (por projeto ou global).
3. **HU 3** – Upload de **áudio ou texto** (transcrição bruta).
4. **HU 4** – **Gerar transcrição** automática se for áudio.
5. **HU 5** – **Identificar** quantas HUs são necessárias (sugestão).
6. **HU 6** – **Gerar** as HUs automaticamente.
7. **HU 7** – **Classificar** cada HU por complexidade (baixa/média/alta).
8. **HU 8** – **Configurar** tabela de pontos por complexidade (se ainda não estiver configurada).
9. **HU 9** – **Calcular** horas por HU (pontos → horas).
10. **HU 10** – **Gerar cronograma** do projeto.
11. **HU 11** – **Visualizar** todas as HUs em modo consolidado.
12. **HU 2** – Quando conveniente: **completar template** com base em transcrição/HUs.
13. **HU 12** – **Definir escopo final** a partir de HUs + transcrição.

*(HU 2 pode ser usada assim que houver transcrição e/ou HUs suficientes.)*

---

## Resumo do reuso de frontend (por tipo de tela)

| Tipo de tela | O que reutilizar (Doc Hub / FRONTEND-REUSO-DOC-HUB) |
|--------------|------------------------------------------------------|
| **Login / Auth** | AuthContext, auth.service, ProtectedRoute, PublicRoute, páginas de login/registro/recuperação, Input/Button. |
| **Dashboard (lista de projetos)** | Layout Dashboard: header, grid de cards de estatísticas, grid de cards clicáveis (projetos no lugar de “contextos”), busca. |
| **Detalhe de projeto** | Layout TranscriptionPage: header com Voltar + título, sidebar (Informações + Ações), tabs (Transcrição, Template, HUs, Estimativa, Cronograma, Consolidado, Escopo), conteúdo em Card + .prose. |
| **Upload (template, áudio, texto)** | Modal ou seção de upload; lista de arquivos; loading; padrão de formulário e erro (bg-error-light, toast). |
| **Geração (transcrição, HUs, escopo, cronograma, preenchimento template)** | Botão “Gerar”/“Completar”, loading no Button, resultado em markdown (.prose), select de engine quando fizer sentido, toasts. |
| **Listagens (HUs, transcrições)** | Cards clicáveis com título, descrição, data, badges (complexidade, status); favorito opcional. |
| **Configuração (tabela de pontos)** | Formulário em Card, Input/select, Button salvar, toast. |
| **Export** | utils/export (md, txt, doc, pdf) para HUs, escopo, cronograma, template preenchido. |

---

## Entidades sugeridas (para backend e frontend)

- **Projeto:** nome, descrição, criadoEm, templateId (opcional), configuração de pontos (baixa/média/alta).
- **Template:** arquivo ou conteúdo, nome, tipo; vinculado a projeto ou global.
- **Transcrição:** projetoId, tipo (áudio | texto), arquivo/url, conteúdo (texto gerado ou enviado), status (uploaded | processing | done), createdAt.
- **UserStory (HU):** projetoId, ordem, título, conteúdo (markdown), complexidade (baixa | média | alta), pontos, horasEstimadas, transcriçãoId (opcional).
- **Configuração de pontos:** projetoId ou global; pontosBaixa, pontosMedia, pontosAlta; horasPorPonto (ou por complexidade).
- **Cronograma:** projetoId, conteúdo (gerado), geradoEm.
- **Escopo:** projetoId, conteúdo (gerado), geradoEm.

*(Comitê/coordenação/pauta podem ser adicionados depois conforme as HUs que você citou antes.)*

---

## Referência cruzada

- **Reuso visual e componentes:** ver `FRONTEND-REUSO-DOC-HUB.md` (stack, design system, componentes UI, auth, layout, modais).
- **Integração e fluxos de geração:** ver `docs.ms` (Zello MIND, agentes, construção de contexto, sanitização).

Este documento pode ser usado como backlog (HUs 1–12) e como guia para adaptar transcrições e reutilizar o frontend do Doc Hub no novo sistema.

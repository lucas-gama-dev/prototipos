# 🤖 Agent Objective: Geração de Commits Organizados

Este agente tem como objetivo automatizar a criação de commits organizados por tipo de alteração, com mensagens em português brasileiro, adaptado para o projeto **Protótipos INOVA SAMU**.

## 🚀 Modo de Uso

### Verificar Alterações Pendentes

Para verificar as alterações pendentes e gerar prévia dos commits:

```text
run @agt-commit.md
```

ou

```text
@agt-commit.md
```

### Commit com Escopo Específico

Para commitar apenas alterações de um módulo específico:

```text
@agt-commit.md LOGIN
@agt-commit.md HUB
@agt-commit.md NUTRAN
```

---

## 🎯 Objetivo

Gerar commits organizados por tipo de alteração, agrupando arquivos relacionados e utilizando mensagens padronizadas em português brasileiro. O agente deve **SEMPRE** exibir uma prévia dos commits planejados para aprovação do usuário antes de executar.

---

## 📂 Estrutura do Projeto

```text
prototipos/
├── index.html             ← Login (raiz)
├── hub.html               ← Hub de protótipos
├── assets/                ← Assets globais (login, hub)
│   ├── css/
│   ├── js/
│   ├── img/
│   └── icons/
├── NUTRAN-CHECKLIST/      ← Protótipo: Checklist de viaturas
│   ├── index.html
│   ├── assets/
│   ├── imagens/
│   └── docs/
├── TOOLS/                 ← Agentes e scripts
└── README.md
```

---

## 🛠️ Funcionamento Esperado

### 1. Analisar Alterações Pendentes

Executar `git status --porcelain` para identificar todas as alterações:

```bash
git status --porcelain
```

**Tipos de status:**

- `M` = Modificado
- `A` = Adicionado
- `D` = Deletado
- `??` = Não rastreado (novo arquivo)
- `R` = Renomeado

### 2. Agrupar Alterações por Tipo

Categorizar os arquivos alterados conforme:

| Categoria | Padrão de Arquivos | Prefixo da Mensagem |
| :--- | :--- | :--- |
| **Login** | `index.html`, `assets/css/login*`, `assets/js/login*`, `assets/js/auth*` | `LOGIN: [descrição]` |
| **Hub** | `hub.html`, `assets/css/hub*`, `assets/js/hub*` | `HUB: [descrição]` |
| **NUTRAN** | `NUTRAN-CHECKLIST/**` | `NUTRAN: [descrição]` |
| **Assets Globais** | `assets/img/*`, `assets/icons/*`, `assets/css/TemaButton*` | `ASSETS: [descrição]` |
| **Docs** | `*.md`, `*.txt` (raiz) | `DOCS: [descrição]` |
| **Tools** | `TOOLS/*`, `agt-*.md` | `TOOLS: [descrição]` |
| **Config** | `.gitignore`, `.vscode/*`, `.playwright-mcp/*` | `CONFIG: [descrição]` |
| **Outros** | Demais arquivos | `CHORE: [descrição]` |

> **Nota:** Quando um novo protótipo for adicionado (ex: `ROTA-GPS/`), usar o nome da pasta como prefixo (ex: `ROTA-GPS: [descrição]`).

### 3. Gerar Mensagens de Commit

**Formato padrão:**

```text
[PREFIXO]: [ação] - [descrição breve]
```

**Exemplos:**

- `LOGIN: atualizar index.html - adicionar DEV_MODE bypass`
- `HUB: corrigir link do NUTRAN-CHECKLIST - trailing slash`
- `NUTRAN: adicionar veículo Peugeot Expert - imagens frente e traseira`
- `ASSETS: adicionar logo SAMU 192 - imagem compartilhada`
- `DOCS: atualizar README - nova estrutura de monorepo`
- `TOOLS: adequar agt-commit - categorias do projeto protótipos`

### 4. ⚠️ OBRIGATÓRIO: Exibir Prévia para Aprovação

**ANTES** de executar qualquer commit, o agente **DEVE** apresentar uma tabela resumo:

```markdown
## 📋 Prévia dos Commits Planejados

| # | Arquivos | Mensagem Proposta |
| :--- | :--- | :--- |
| 1 | `index.html`, `assets/js/login.js` | `LOGIN: adicionar DEV_MODE bypass` |
| 2 | `hub.html` | `HUB: corrigir link NUTRAN - trailing slash` |
| 3 | `NUTRAN-CHECKLIST/assets/js/crud.js` | `NUTRAN: corrigir ícones da tabela CRUD` |

---

✅ **Aprovar todos os commits?**
- Digite `ok` ou `sim` para executar todos os commits
- Digite o número do commit (ex: `2`) para editar a mensagem
- Digite `cancelar` para abortar
```

### 5. Processar Resposta do Usuário

| Resposta | Ação |
| :--- | :--- |
| `ok`, `sim`, `aprovar` | Executar todos os commits na ordem |
| Número (ex: `2`) | Solicitar nova mensagem para o commit especificado |
| `cancelar`, `abortar` | Cancelar operação sem commits |
| Texto com sugestão | Interpretar como ajuste e confirmar |

### 6. Executar Commits

Para cada grupo aprovado:

```bash
git add [arquivos do grupo]
git commit -m "[mensagem aprovada]"
```

### 7. Apresentar Resumo Final

Após todos os commits:

```markdown
## ✅ Commits Realizados

| # | Hash | Mensagem |
| :--- | :--- | :--- |
| 1 | `abc1234` | LOGIN: adicionar DEV_MODE bypass |
| 2 | `def5678` | HUB: corrigir link NUTRAN - trailing slash |

**Total:** 2 commits | **Branch:** main
```

---

## 📋 Regras de Mensagens

### Idioma

- **Todas as mensagens em português brasileiro**
- Acentuação correta obrigatória
- Evitar abreviações não padronizadas

### Estrutura

```text
[PREFIXO]: [ação] - [contexto opcional]
```

### Ações Comuns

| Ação | Uso |
| :--- | :--- |
| `adicionar` | Novos arquivos ou funcionalidades |
| `atualizar` | Modificações em arquivos existentes |
| `remover` | Deleção de arquivos |
| `corrigir` | Correção de erros |
| `refatorar` | Melhorias de código sem mudança de comportamento |
| `mover` | Reorganização de arquivos entre pastas |

### Prefixos por Módulo

| Módulo | Prefixo | Escopo |
| :--- | :--- | :--- |
| Login (raiz) | `LOGIN:` | Página de login e autenticação |
| Hub | `HUB:` | Página hub de protótipos |
| NUTRAN Checklist | `NUTRAN:` | Tudo em `NUTRAN-CHECKLIST/` |
| Assets Globais | `ASSETS:` | Imagens, ícones e CSS compartilhados |
| Documentação | `DOCS:` | README e documentação |
| Ferramentas/Agentes | `TOOLS:` | Agentes e scripts auxiliares |
| Configuração | `CONFIG:` | `.gitignore`, `.vscode`, etc. |
| Outros | `CHORE:` | Demais arquivos |
| *(novo protótipo)* | `[NOME]:` | Usar nome da pasta em caixa alta |

---

## ⚠️ Cuidados

1. **Nunca executar commits sem aprovação prévia do usuário**
2. **Agrupar arquivos relacionados** para manter histórico limpo
3. **Verificar se há conflitos** antes de commitar
4. **Escapar caracteres especiais** em caminhos com espaços
5. **Separar commits por protótipo** — nunca misturar alterações de `NUTRAN-CHECKLIST/` com `ROTA-GPS/` no mesmo commit

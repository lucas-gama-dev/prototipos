# Mapeamento Completo: Checklist de Motos (CLMT) - SAU Equipes

**Data do mapeamento:** 2026-04 (baseado em análise do codebase)  
**Autor da análise:** Grok (baseado em exploração de código frontend + backend + schema DB)  
**Referência principal solicitada:** `/home/inova/Workspace/sau-web-dev/sau-web/equipes/app/src/components/Checklist/Moto`

---

## 1. Resumo Executivo

- O **Checklist de Motos** (internamente chamado de **CLMT** - Checklist Moto) possui um fluxo completo implementado no código, mas está **desativado** para equipes do tipo `TIPO_MOTO = 7`.
- No app RN atual (`equipes/app`), o `ChecklistScreen` bloqueia explicitamente motos com uma mensagem de "disponível em próximas versões".
- Existe código dedicado e maduro:
  - Componentes específicos em `Checklist/Moto/`
  - Actions e reducers dedicados (`ChecklistMoto*`, `OpcoesMoto*`, `EstadosMoto*`)
  - Parser backend rico com suporte a múltiplas categorias de **bolsas**
- O backend (`equipes/server`) expõe dezenas de rotas socket sob o namespace `checklist-moto/*`
- Os dados são persistidos via **Stored Procedures** no schema `cdr` (MySQL)
- Existe uma versão mais granular e moderna de "bolsas" (materiais, clínico, trauma, venoso etc.) implementada no parser, mas o frontend RN clássico ainda usa o modelo mais antigo (EAD + Sistema).

**Conclusão:** O feature está "pronto no backend e semi-pronto no frontend" — o principal bloqueio é a guarda em `ChecklistScreen.js`.

---

## 2. Fluxo Atual vs. Código Preparado

### 2.1 Caminho que o usuário vê hoje (ChecklistScreen.js)

```js
if (equipe_tipo_id === EQUIPES_TIPOS.TIPO_MOTO) {
  return <WarningComponent title="Checklist indisponível.\nEstará acessível nas próximas versões do aplicativo." />;
}
```

Depois disso, usa o fluxo genérico (`ChecklistNovo` + `ChecklistNovoTabs` + `ChecklistPendente`).

### 2.2 Fluxo preparado para motos (não usado atualmente)

- `ChecklistMotos.js` (exporta como `ChecklistNovo` internamente)
- `ChecklistNovoMotosTabs.js` (TabView com 4 abas)
- Componentes isolados na pasta `Moto/`
- Actions específicas importadas de `actions/Checklist/OpcoesMoto*`, `EstadosMoto*`, `ChecklistMotoActions`, `PendenciasChecklistMotoActions`

---

## 3. Interfaces e Componentes (Frontend RN)

### Pasta de referência

`/home/inova/Workspace/sau-web-dev/sau-web/equipes/app/src/components/Checklist/Moto/`

**Componentes principais:**

| Arquivo              | Responsabilidade                                                      | Observação                  |
|----------------------|-----------------------------------------------------------------------|-----------------------------|
| `Moto.js`            | Aba "Moto" - dados da viatura + Tráfego + Sistema                     | Usa `opcoes_sistema`        |
| `EAD.js`             | Aba "Baús" - Equipamentos, acessórios e documentos                    | Modelo antigo (opcoes_ead)  |
| `Indicadores.js`     | Aba "Inspeção" - Combustível, Óleo, Pneus, Inspeção, Higienização     | Sliders + listas            |
| `Conclusao.js`       | Aba final - Observações + CredenciaisCondutor + Salvar                | Chama `salvarChecklist`     |
| `CadaEad.js`         | Item de EAD com Picker de estado                                      | Conectado ao reducer moto   |
| `CadaInspecao.js`    | Item de Inspeção                                                      |                             |
| `CadaPneu.js`        | Item de Pneu                                                          |                             |
| `CadaParteExterna.js`| Item genérico de sistema/estrutura                                    |                             |

**Arquivos orquestradores:**

- `ChecklistMotos.js` — Carregamento em cascata + state + validação + submit
- `ChecklistNovoMotosTabs.js` — TabView (react-native-tab-view) com rotas "first", "second", "tree", "for"
- `ChecklistMotoPendente.js` — Tela de finalização de pendência (hora/km final)

**Outros arquivos relevantes:**

- `actions/Checklist/ChecklistMotoActions.js`
- `actions/Checklist/PendenciasChecklistMotoActions.js`
- `reducers/Checklist/OpcoesMotoEadReducer.js`, `EstadosMotoEadReducer.js`, etc.
- `helpers/EquipesTipo.js` (TIPO_MOTO = 7)

---

## 4. Fluxo de Dados (Redux + Socket)

1. `componentWillMount` em `ChecklistMotos.js` dispara sequência de actions via Promise chain.
2. Cada action emite no `SocketManager` um evento `checklist-moto/xxx`.
3. Backend (parser) responde com evento `-result`.
4. `Promises.js` resolve/rejeita → reducer atualiza estado.
5. Componentes conectados via `mapStateToProps` consomem os `items`.

**Exemplo de action (OpcoesMotoEadActions.js):**

```js
SocketManager.instance().emit("checklist-moto/recuperar-moto-opcoes-ead", { REQ_ID });
SocketManager.instance().on('recuperar-clmt-moto-opcoes-ead-result', ...);
```

---

## 5. Backend - Parser (equipes/server)

**Arquivo principal:**
`/home/inova/Workspace/sau-web-dev/sau-web/equipes/server/parsers/v1/classes/checklist-moto.js`

Classe: `ChecklistMotoParser`

### Rotas Socket registradas (todas requerem device + user auth)

**Carga de opções/estados (modelo antigo):**

- `checklist-moto/recuperar-moto-opcoes-sistema`
- `checklist-moto/recuperar-moto-opcoes-ead`
- `checklist-moto/recuperar-opcoes-inspencao`
- `checklist-moto/recuperar-opcoes-pneus`
- respectivos estados

**Carga de opções (modelo granular / "segunda moto"):**

- `recuperar-moto-opcoes-checklist-base`
- `recuperar-moto-opcoes-checklist-estrutura`
- `recuperar-moto-opcoes-checklist-clinico-gerais`
- `recuperar-moto-opcoes-checklist-psicotropicos`
- `recuperar-moto-opcoes-checklist-comprimidos-gotas`
- `recuperar-moto-opcoes-checklist-bolsa-materiais`
- `recuperar-moto-opcoes-checklist-spray`
- `recuperar-moto-opcoes-checklist-equipamentos-materiais`
- `recuperar-moto-opcoes-checklist-clinico-bolsas`
- `recuperar-moto-opcoes-checklist-trauma-gerais`
- `recuperar-moto-opcoes-checklist-trauma-bolsas`
- `recuperar-moto-opcoes-checklist-bolsa-venoso`
- `recuperar-moto-estados-checklist-baus`

**Escrita:**

- `checklist-moto/salvar`
- `checklist-moto/salvar-checklist-moto-base`
- `checklist-moto/salvar-checklist-segunda-moto`

**Pendência / Finalização / Utilitários:**

- `checklist-moto/verificar-pendencias`
- `checklist-moto/salvar-finalizacao-pendencia`
- `checklist-moto/verificar-credenciais-condutor`

**Callbacks de resposta** seguem o padrão `recuperar-clmt-...-result`, `salvar-clmt-result`, `verificar-pendencias-checklist-result` etc.

**Observação importante:** O arquivo contém **duas versões** da função `salvar_checklist_moto` (uma simples e outra extremamente detalhada com 10+ categorias de bolsas). A segunda versão é usada pelas rotas "segunda-moto".

---

## 6. Stored Procedures Principais (schema `cdr`)

### Carga

- `get_all_clmt_opcoes_sistema`
- `get_all_clmt_opcoes_ead`
- `get_all_clmt_opcoes_inspencao`
- `get_all_clmt_pneus_opcoes`
- `get_all_clmt_opcoes_bolsa_materiais`
- `get_all_clmt_opcoes_clinico_bolsas`
- `get_all_clmt_opcoes_trauma_bolsas`
- `get_all_clmt_opcoes_bolsa_venoso`
- `get_all_clmt_opcoes_equipamentos_materiais`
- `get_all_clmt_opcoes_clinico_gerais`
- `get_all_clmt_opcoes_psicotropicos`
- `get_all_clmt_opcoes_comprimidos_gotas`
- `get_all_clmt_opcoes_trauma_gerais`
- `get_all_clmt_opcoes_spray`
- `get_all_clmt_opcoes_checklist_base`
- `get_all_clmt_opcoes_checklist_estrutura`
- ... (e respectivos `get_all_clmt_estados_*`)

### Escrita

- `salvar_clmt_v2` (cabeçalho + retorna `CHECKLIST_ID`)
- `salvar_clmt_sistema`
- `salvar_clmt_inspecao`
- `salvar_clmt_ead`
- `salvar_clmt_pneus`
- `salvar_clmt_bolsa_materiais`
- `salvar_clmt_clinico_bolsas`
- `salvar_clmt_trauma_bolsas`
- `salvar_clmt_bolsa_venoso`
- `salvar_clmt_equipamentos_materiais`
- `salvar_clmt_clinico_gerais`
- `salvar_clmt_psicotropicos`
- `salvar_clmt_comprimidos_gotas`
- `salvar_clmt_trauma_gerais`
- `salvar_clmt_estrutura`
- `salvar_clmt_base`
- `salvar_clmt_spray`

### Pendência e Finalização

- `clmt_verifica_pendencia_checklist(VEICULO_ID, EQUIPE_ID)`
- `clmt_salvar_finalizacao`

### Credenciais

- `verifica_credenciais_condutor`

---

## 7. Tabelas Principais do Banco

Localização: `mysql/dtd/cdr/tables/`

- `sau_clmt` (cabeçalho principal)
- `sau_clmt_sistema`
- `sau_clmt_ead`
- `sau_clmt_pneus`
- `sau_clmt_bolsa_materiais`
- `sau_clmt_clinico_bolsas`
- `sau_clmt_trauma_bolsas`
- `sau_clmt_bolsa_venoso`
- `sau_clmt_equipamentos_materiais`
- `sau_clmt_clinico_gerais`
- `sau_clmt_psicotropicos`
- `sau_clmt_comprimidos_gotas`
- `sau_clmt_trauma_gerais`
- `sau_clmt_estrutura`
- `sau_clmt_base`
- `sau_clmt_spray`
- Tabelas de opções: `sau_clmt_opcoes_*`
- Tabelas de estados: `sau_clmt_estados_*` e `sau_clmt_pneus_estados`

---

## 8. Itens do Checklist — Bolsas e Categorias (dados reais dos seeds)

### 8.1 EAD / Baús (modelo antigo — tab "Baús" no código RN atual)

**Tabela:** `sau_clmt_opcoes_ead`

1. Banco
2. Carenagem Farol
3. Carenagem L.D
4. Carenagem L.E
5. Carenagem Tanque
6. Paralamas Traseiro
7. Paralamas Dianteiro
8. Bateria reserva DEA
9. Carregador bateria DEA
10. Carregador celular
11. Celular Operacional
12. Carregador HT
13. Radio HT

### 8.2 Bolsa Materiais

**Tabela:** `sau_clmt_opcoes_bolsa_materiais`

1. Swab
2. Seringa 1 ml, 3 ml, 10 ml e 20 ml
3. Scalp 21, 23 e 25G
4. Pote para Pérfuro-cortante
5. Garrote
6. Algodão (pote)
7. Alcool 70% - Líquido
8. Agulha 30x8 / 25x7
9. Agulha 40 x12

### 8.3 Clínico Bolsas

**Tabela:** `sau_clmt_opcoes_clinico_bolsas`

1. Termômetro
2. Sensor do Oxímetro - Adulto, Pediátrico, Neo
3. Oxímetro de Pulso Portátil
4. Lanceta + Algodão
5. Glicosímetro com Fita de Glicemia (caixa)
6. Estetoscópio
7. Esfigmomanômetro
8. Máscara do BVM Nº 3, 4 e 5
9. Máscara de BVM Nº 00; 0; 1; 2
10. Filtro HME
11. Cânula Nasofaríngea Nº 22; 28; 30; 32; 34
12. Cânula de Guedel Nº 0; 1; 2; 3; 4 e 5
13. BVM Pediátrico/Neonatal
14. BVM Adulto

### 8.4 Trauma Bolsas

**Tabela:** `sau_clmt_opcoes_trauma_bolsas`

1. Kit para Parto
2. Transofix
3. Compressa Cirúrgica (pacote)
4. Gaze estéril (pacote)
5. Atadura de Crepom 30cm
6. Atadura de Crepom 20/25cm
7. Atadura de Crepom 10/15cm
8. Torniquete
9. Tesoura de Resgate
10. Manta Térmica
11. Imobilizador Pélvico
12. Fita Zebrada

### 8.5 Bolsa Venoso

**Tabela:** `sau_clmt_opcoes_bolsa_venoso`

1. Swab
2. Solução Ringer com Lactato - Sol Inj. - Embalagem 500 ml
3. Solução C. de Sódio 0,9% Sol Inj. - Embalagem 500ml
4. Solução C. de Sódio 0,9% Sol Inj. - Embalagem 100ml
5. Gaze Estéril (pacote)
6. Garrote
7. Esparadrapo (rolo)
8. Equipo Simples
9. Equipo Intermediário Duas Vias
10. Curativo com filme transparente para cateter
11. Cateter Intrav. Perif. 14,16,18,20,22 e 24
12. Alcool 70% - Líquido

### 8.6 Equipamentos Materiais

**Tabela:** `sau_clmt_opcoes_equipamentos_materiais`

1. Pás de Desfibrilação Manual - Adulto e Infantil
2. Eletrodo (unidades)
3. DEA (ZOLL)
4. Cabo de ECG 5 derivações

### 8.7 Sistema (Aba "Moto")

**Tabela:** `sau_clmt_opcoes_sistema`

1. Folga na coluna de direção
2. Folga na corrente e desgaste da relação
3. Sistema de Freio
4. Sistema Elétrico
5. Carga Bateria

### 8.8 Estruturas

**Tabela:** `sau_clmt_opcoes_estruturas`

1. Kit de ferramentas
2. Controle de Tração
3. FREIO ABS
4. Banco
5. Carenagem Farol
6. Carenagem L.D
7. Carenagem L.E
8. Carenagem Tanque
9. Paralamas Traseiro
10. Paralamas Dianteiro

### 8.9 Clínico Gerais (medicamentos)

**Tabela:** `sau_clmt_opcoes_clinico_gerais` (17 itens)

Tenoxicam 20 mg, Prometazina 25 mg/ml, Ondansetrona, Omeprazol, Ocitocina, N-butil-Escopolamina, Lidocaina Gel 2%, Hidrocortisona 500mg e 100mg, Hidralazina, Glicose 50%, Furosemida, Epinefrina, Dipirona, Atropina, Amiodarona, Água para Injetáveis.

### 8.10 Psicotrópicos

**Tabela:** `sau_clmt_opcoes_psicotropicos`

1. Midazolan 5 mg/ml - amp. 03 ml
2. Tramadol 50 mg/ml - amp. 02 ml
3. Naloxona 0,4mg/ml - amp. 01 ml
4. Haloperidol 5mg/ml - amp. 01 ml
5. Flumazenil 0,1 mg/ml - amp. 05 ml
6. Fenobarbital Sódico 100 mg/ml - amp. 02 ml
7. Diazepam 5mg/ml - amp. 02 ml

### 8.11 Comprimidos / Gotas

**Tabela:** `sau_clmt_opcoes_comprimidos_gotas`

1. Propranolol 40 mg (cartela - cp)
2. Paracetamol 200mg/ml - frasco
3. Isossorbida 5mg (cartela - cp)
4. Diazepam 5mg (comprimido)
5. Clopidogrel 75mg (cartela - cp)
6. Captopril 25mg (cartela - cp)
7. AAS 100mg (cartela - cp)

### 8.12 Spray

**Tabela:** `sau_clmt_opcoes_spray`

1. Salbutamol 100mcg - Spray ou Aerossol
2. Espaçador com Máscara

### 8.13 Trauma Gerais

**Tabela:** `sau_clmt_opcoes_trauma_gerais`

Máscara N95, Luva de Procedimento não Estéril, Luva Estéril, Gorro, Avental Descartável, Talas (M/P/PP), Prancheta, Coletor para Pérfuro-cortante, Colar Cervical Regulável (Infantil e Adulto).

### 8.14 Base (lista_base)

**Tabela:** `sau_clmt_opcoes_lista_base`

1. Bateria reserva DEA
2. Carregador bateria DEA
3. Carregador celular
4. Celular Operacional
5. Carregador HT
6. Radio HT

---

## 9. Observações e Achados Relevantes

- **Bug no frontend de motos:** Em `ChecklistMotos.js` (linhas ~213-228), o código de preparação dos arrays para salvar copia repetidamente `this.state.partes_externas` para `partes_sistema`, `partes_inspencao` etc. Isso corrompe os dados enviados.
- **Duplicação no backend:** O parser tem duas implementações quase idênticas de salvamento (uma simples + uma com 10+ categorias de bolsas). A segunda versão (`salvar_checklist_segunda_moto`) é mais completa.
- **app-v2 (TypeScript):** Já reconhece `MOTO_TEAM_TYPE_ID = 7` e possui estrutura de `ChecklistService` mais moderna. Pode ser o caminho futuro.
- **Pendências:** Usam a mesma tabela `sau_clmt` (campo `conclusao_pendente = 1`). O verificador de pendência é `clmt_verifica_pendencia_checklist`.
- **Formação de Equipe** é pré-requisito (fornece o veículo e `VEICULO_ID`).
- **Credenciais do condutor** são validadas via SP dedicada (não usa o login normal).
- Os seeds estão em `mysql/dtd/cdr/dados/sau_clmt_opcoes_*.sql`.

---

## 10. Arquivos-Chave para Referência Rápida

**Frontend (RN clássico):**

- `src/screens/ChecklistScreen.js`
- `src/components/Checklist/ChecklistMotos.js`
- `src/components/Checklist/ChecklistNovoMotosTabs.js`
- `src/components/Checklist/Moto/*`
- `src/actions/Checklist/ChecklistMotoActions.js` e `PendenciasChecklistMotoActions.js`

**Backend:**

- `equipes/server/parsers/v1/classes/checklist-moto.js`

**Banco:**

- `mysql/dtd/cdr/tables/sau_clmt*.sql`
- `mysql/dtd/cdr/procedures/salvar_clmt*.sql` e `get_all_clmt*.sql`
- `mysql/dtd/cdr/dados/sau_clmt_opcoes_*.sql` (dados reais dos itens)

---

**Documento gerado automaticamente a partir da análise do codebase em `/home/inova/Workspace/sau-web-dev/sau-web`.**

Se precisar de:

- Versão em .docx ou .pdf
- Foco em app-v2
- Plano de reativação / migração
- Análise de gaps entre frontend e backend granular

É só pedir!

import { defaultChecklist } from "./data/checklist.js";
import { vehicleTypesConfig } from "./data/vehicles.js";
import { dom } from "./dom.js";
import { getVehicleTypes } from "./state.js";
import { escapeHtml } from "./utils.js";

// CRUD de exemplo (independente do mapeamento). Duas entidades: Itens de
// checklist e Marcas/Modelos (cada marca traz seus tipos embutidos). Um item
// aplica-se a um ou mais tipos. Persistido em localStorage.

const KEYS = {
  marcas: "crud_marcas",
  itens: "crud_itens",
  // Ordem dos itens por tipo: { [tipoId]: [itemId, ...] }
  ordens: "crud_ordens",
  // Imagens por marca: { [marcaId]: { frente: dataUrl, traseira: dataUrl } }
  imagens: "crud_imagens",
};

// Versao dos dados-semente. Ao incrementar, os seeds sao reaplicados.
const SEED_VERSION = 9;
const SEED_VERSION_KEY = "crud_seed_version";

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora falhas de storage (modo privado, cota, etc.).
  }
}

// Marcas/modelos com seus tipos embutidos. Ids de tipo sao globais (referenciados
// pelas aplicacoes dos itens), por isso nao se repetem entre marcas.
function seedMarcas() {
  return [
    {
      id: 1,
      nome: "Mercedes Sprinter",
      tipos: [
        { id: 1, sigla: "USB", nome: "Unidade de Suporte Básico" },
        { id: 2, sigla: "USA", nome: "Unidade de Suporte Avançado" },
        { id: 3, sigla: "USI", nome: "Unidade de Suporte Intermediário" },
      ],
    },
    {
      id: 2,
      nome: "Renault Master",
      tipos: [
        { id: 4, sigla: "USB", nome: "Unidade de Suporte Básico" },
        { id: 5, sigla: "USA", nome: "Unidade de Suporte Avançado" },
        { id: 6, sigla: "USI", nome: "Unidade de Suporte Intermediário" },
      ],
    },
    {
      id: 3,
      nome: "Toyota SW4",
      tipos: [
        { id: 7, sigla: "VIR", nome: "Viatura de Intervenção Rápida" },
        { id: 8, sigla: "VIM", nome: "Viatura de Intervenção Média" },
      ],
    },
    {
      id: 4,
      nome: "Yamaha Versys",
      tipos: [{ id: 9, sigla: "MOTO", nome: "Motolância" }],
    },
  ];
}

// Itens de checklist com suas aplicacoes (tipos vinculados).
// Itens que se aplicam a mais de um veiculo recebem multiplos tipoIds.
function seedItens() {
  const AMB = [1, 2, 3, 4, 5, 6]; // Mercedes + Renault (USB/USA/USI)
  const SW4 = [7, 8];              // Toyota SW4 (VIR/VIM)
  const MOTO = [9];                // Yamaha Versys (MOTO)
  const AMB_SW4 = [...AMB, ...SW4]; // Compartilhados ambulância + SW4

  // IDs de itens da ambulância que se aplicam TAMBÉM ao SW4
  // (peças comuns: parabrisa, capô, faróis, parachoque, retrovisores, portas, etc.)
  const idsCompartilhados = [
    2,  // Parabrisa
    3,  // Capô
    4,  // Farol Dianteiro Direito
    5,  // Grade Frontal
    6,  // Farol Dianteiro Esquerdo
    7,  // Parachoque
    13, // Retrovisor Esquerdo
    14, // Porta Dianteira Esquerda
    15, // Lataria Lateral Esquerda
    17, // Luz Patrulheiro
    19, // Camera
    20, // Porta Traseira Esquerda
    21, // Porta Traseira Direita
    22, // Farol Traseiro Esquerdo
    25, // Farol Traseiro Direito
    33, // Retrovisor Direito
    34, // Porta Dianteira Direita
  ];

  // Itens das ambulâncias (34), com os compartilhados recebendo SW4 nos tipos
  const itensAmbulancias = defaultChecklist.map((point, index) => {
    const id = index + 1;
    const tipos = idsCompartilhados.includes(id) ? AMB_SW4.slice() : AMB.slice();
    return { id, descricao: point.descricao, aplicacoes: tipos };
  });

  // Itens EXCLUSIVOS da Toyota SW4 (peças que não existem nas ambulâncias)
  const itensSW4 = [
    "Grade de Proteção (Mata-Burro)",
    "Rack de Teto",
    "Antena",
    "Estribo Lateral Esquerdo",
    "Estribo Lateral Direito",
    "Para-lama Dianteiro Esquerdo",
    "Para-lama Dianteiro Direito",
    "Para-lama Traseiro Esquerdo",
    "Para-lama Traseiro Direito",
    "Vidro Traseiro",
    "Lataria Lateral Direita",
  ];

  // Itens da moto (Yamaha Versys - MOTO)
  const itensMoto = [
    "Folga na Coluna de Direção",
    "Folga na Corrente e Desgaste da Relação",
    "Sistema de Freio",
    "Sistema Elétrico",
    "Carga Bateria",
    "Kit de Ferramentas",
    "Controle de Tração",
    "Freio ABS",
    "Banco",
    "Carenagem Farol",
    "Carenagem Lado Direito",
    "Carenagem Lado Esquerdo",
    "Carenagem Tanque",
    "Paralamas Traseiro",
    "Paralamas Dianteiro",
    "Capacete",
  ];

  let nextId = itensAmbulancias.length + 1;

  const itensSW4Seed = itensSW4.map((desc) => ({
    id: nextId++,
    descricao: desc,
    aplicacoes: SW4.slice(),
  }));

  const itensMotoSeed = itensMoto.map((desc) => ({
    id: nextId++,
    descricao: desc,
    aplicacoes: MOTO.slice(),
  }));

  return [...itensAmbulancias, ...itensSW4Seed, ...itensMotoSeed];
}

const store = {
  marcas: read(KEYS.marcas) || seedMarcas(),
  itens: read(KEYS.itens) || seedItens(),
  ordens: read(KEYS.ordens) || {},
  imagens: read(KEYS.imagens) || {},
};

// Aplica os seeds no primeiro uso e os reaplica quando SEED_VERSION muda.
if (Number(read(SEED_VERSION_KEY)) !== SEED_VERSION) {
  store.marcas = seedMarcas();
  store.itens = seedItens();
  write(KEYS.marcas, store.marcas);
  write(KEYS.itens, store.itens);
  write(SEED_VERSION_KEY, SEED_VERSION);
}

// Retorna itens do CRUD aplicaveis a uma marca, na ordem salva (para uso externo).
// Cada item recebe um campo "ordem" sequencial (1, 2, 3...).
export function getChecklistForMarca(marcaId) {
  if (marcaId == null) return [];
  const ordem = store.ordens[marcaId] || [];
  const pos = new Map(ordem.map((id, index) => [id, index]));
  const tipoIds = (
    store.marcas.find((m) => m.id === marcaId)?.tipos || []
  ).map((t) => t.id);

  return store.itens
    .filter((item) =>
      (item.aplicacoes || []).some((tid) => tipoIds.includes(tid)),
    )
    .slice()
    .sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id) : Infinity;
      const pb = pos.has(b.id) ? pos.get(b.id) : Infinity;
      return pa - pb || a.id - b.id;
    })
    .map((item, index) => ({
      id: item.id,
      descricao: item.descricao,
      ordem: index + 1,
    }));
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function persist(entity) {
  write(KEYS[entity], store[entity]);
}

function save(entity, data) {
  const list = store[entity];

  if (data.id != null) {
    const index = list.findIndex((item) => item.id === data.id);
    if (index >= 0) list[index] = { ...list[index], ...data };
  } else {
    list.push({ ...data, id: nextId(list) });
  }

  persist(entity);
}

function remove(entity, id) {
  store[entity] = store[entity].filter((item) => item.id !== id);
  persist(entity);
}

// ---- Estado da UI ----

const ui = {
  tab: "itens",
  form: null, // { entity, mode, data } | null
  ordem: { marcaId: null }, // contexto da aba Ordem (por marca/modelo)
  imagens: { marcaId: null }, // contexto da aba Imagens
};

function marcaNome(id) {
  const marca = store.marcas.find((item) => item.id === id);
  return marca ? marca.nome : "—";
}

// Todos os tipos (achatados), cada um com a marca dona.
function allTipos() {
  return store.marcas.flatMap((marca) =>
    (marca.tipos || []).map((tipo) => ({ ...tipo, marcaId: marca.id })),
  );
}

function findTipo(id) {
  for (const marca of store.marcas) {
    const tipo = (marca.tipos || []).find((t) => t.id === id);
    if (tipo) return { ...tipo, marcaId: marca.id };
  }
  return null;
}

function tipoSigla(id) {
  const tipo = findTipo(id);
  return tipo ? tipo.sigla : "—";
}

function tipoMarcaId(id) {
  const tipo = findTipo(id);
  return tipo ? tipo.marcaId : null;
}

function tiposDaMarca(marcaId) {
  const marca = store.marcas.find((m) => m.id === marcaId);
  return marca ? marca.tipos || [] : [];
}

// Badges com as siglas dos tipos de uma marca/modelo (ex.: [USB] [USA] [USI]).
function tiposBadges(marcaId) {
  const tipos = tiposDaMarca(marcaId);
  if (!tipos.length) return '<span class="crud-null">—</span>';
  return `<div class="crud-apl-tags">${tipos
    .map((t) => `<span class="crud-badge">${escapeHtml(t.sigla)}</span>`)
    .join(" ")}</div>`;
}

// Itens que aplicam um tipo (id de tipo presente na lista de aplicacoes).
function itensComTipo(tipoId) {
  return store.itens.filter((item) => (item.aplicacoes || []).includes(tipoId))
    .length;
}

// Itens que aplicam algum tipo de uma marca/modelo.
function itensComMarca(marcaId) {
  return store.itens.filter((item) =>
    (item.aplicacoes || []).some((tipoId) => tipoMarcaId(tipoId) === marcaId),
  ).length;
}

// Resumo das aplicacoes de um item, agrupado por marca (derivada do tipo).
function aplicacoesResumo(item) {
  const aplicacoes = item.aplicacoes || [];
  if (!aplicacoes.length) return '<span class="crud-null">—</span>';

  const porMarca = new Map();
  aplicacoes.forEach((tipoId) => {
    const nome = marcaNome(tipoMarcaId(tipoId));
    if (!porMarca.has(nome)) porMarca.set(nome, []);
    porMarca.get(nome).push(tipoSigla(tipoId));
  });

  return `<div class="crud-apl-resumo">${[...porMarca.entries()]
    .map(
      ([nome, tipos]) =>
        `<div><span class="crud-apl-marca">${escapeHtml(nome)}</span> <span class="crud-badge">${tipos
          .map((t) => escapeHtml(t))
          .join("/")}</span></div>`,
    )
    .join("")}</div>`;
}

function rowActions(entity, id) {
  return `
    <td class="crud-actions">
      <button type="button" class="crud-icon-btn" data-edit="${entity}" data-id="${id}" title="Editar">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button type="button" class="crud-icon-btn is-danger" data-del="${entity}" data-id="${id}" title="Excluir">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>`;
}

function formActions(editing) {
  return `
    <div class="crud-form-actions">
      <button type="button" class="crud-btn-cancel" data-crud-cancel>
        <i class="fa-solid fa-xmark"></i> Cancelar
      </button>
      <button type="submit" class="crud-btn-save">
        <i class="fa-solid fa-check"></i> ${editing ? "Salvar" : "Adicionar"}
      </button>
    </div>`;
}

function emptyRow(colspan) {
  return `<tr><td colspan="${colspan}" class="crud-empty">Nenhum registro cadastrado.</td></tr>`;
}

// ---- Views por aba ----

function itensForm() {
  const data = ui.form ? ui.form.data : {};
  const aplicacoes = data.aplicacoes || []; // ids de tipo
  const editing = ui.form && ui.form.mode === "edit";

  const marcaOpts = store.marcas
    .map((m) => {
      const tipos = (m.tipos || []).map((t) => t.sigla).join("/");
      const label = tipos ? `${m.nome} (${tipos})` : m.nome;
      return `<option value="${m.id}">${escapeHtml(label)}</option>`;
    })
    .join("");

  // Agrupa os tipos aplicados por marca (a marca já traz seus tipos).
  const porMarca = new Map();
  aplicacoes.forEach((tipoId) => {
    const marcaId = tipoMarcaId(tipoId);
    if (marcaId == null) return;
    if (!porMarca.has(marcaId)) porMarca.set(marcaId, []);
    porMarca.get(marcaId).push(tipoId);
  });

  const aplList = porMarca.size
    ? `<ul class="crud-apl-list">${[...porMarca.entries()]
        .map(
          ([marcaId, tipoIds]) => `
          <li class="crud-apl-item">
            <span><strong>${escapeHtml(marcaNome(marcaId))}</strong> <span class="crud-badge">${tipoIds
              .map((t) => escapeHtml(tipoSigla(t)))
              .join("/")}</span></span>
            <button type="button" class="crud-icon-btn is-danger" data-apl-del="${marcaId}" title="Remover">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </li>`,
        )
        .join("")}</ul>`
    : `<p class="crud-apl-empty">Adicione uma ou mais marcas/modelos.</p>`;

  return `
    <form class="crud-form" data-entity="itens" data-id="${data.id || ""}">
      <div class="crud-field crud-field-wide">
        <label for="crudDescricao">Descrição</label>
        <input id="crudDescricao" type="text" value="${escapeHtml(data.descricao || "")}" placeholder="Ex.: Asa Dianteira" autocomplete="off" />
      </div>

      <div class="crud-apl">
        <span class="crud-apl-label">Aplica-se a (marca/modelo/tipo)</span>
        <div class="crud-apl-add">
          <select id="crudAplMarca">${marcaOpts || '<option value="">—</option>'}</select>
          <button type="button" class="crud-btn-new" data-apl-add>
            <i class="fa-solid fa-plus"></i> Adicionar
          </button>
        </div>
        ${aplList}
      </div>

      ${formActions(editing)}
    </form>`;
}

function viewItens() {
  const rows = store.itens
    .map(
      (it) => `
      <tr>
        <td class="crud-num">${it.id}</td>
        <td>${escapeHtml(it.descricao)}</td>
        <td>${aplicacoesResumo(it)}</td>
        ${rowActions("itens", it.id)}
      </tr>`,
    )
    .join("");

  return `<table class="crud-table">
      <thead><tr>
        <th>#</th>
        <th><i class="fa-solid fa-align-left"></i> Descrição</th>
        <th><i class="fa-solid fa-link"></i> Aplica-se a (marca/modelo/tipo)</th>
        <th></th>
      </tr></thead>
      <tbody>${rows || emptyRow(4)}</tbody>
    </table>`;
}

function marcasForm() {
  const data = ui.form ? ui.form.data : {};
  const tipos = data.tipos || [];
  const editing = ui.form && ui.form.mode === "edit";

  const tipoRows = tipos.length
    ? `<div class="crud-tipo-list">${tipos
        .map(
          (t, index) => `
          <div class="crud-tipo-row" data-tipo-id="${t.id != null ? t.id : ""}">
            <input class="crud-tipo-sigla" type="text" value="${escapeHtml(t.sigla || "")}" placeholder="Sigla" maxlength="10" autocomplete="off" />
            <input class="crud-tipo-nome" type="text" value="${escapeHtml(t.nome || "")}" placeholder="Descrição" autocomplete="off" />
            <button type="button" class="crud-icon-btn is-danger" data-tipo-del="${index}" title="Remover">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>`,
        )
        .join("")}</div>`
    : `<p class="crud-apl-empty">Nenhum tipo. Adicione os tipos desta marca/modelo.</p>`;

  return `
    <form class="crud-form" data-entity="marcas" data-id="${data.id || ""}">
      <div class="crud-field crud-field-wide">
        <label for="crudNome">Marca/Modelo</label>
        <input id="crudNome" type="text" value="${escapeHtml(data.nome || "")}" placeholder="Ex.: Mercedes Sprinter" autocomplete="off" />
      </div>

      <div class="crud-apl">
        <span class="crud-apl-label">Tipos desta marca/modelo</span>
        ${tipoRows}
        <button type="button" class="crud-btn-new crud-btn-add-tipo" data-tipo-add>
          <i class="fa-solid fa-plus"></i> Adicionar tipo
        </button>
      </div>

      ${formActions(editing)}
    </form>`;
}

function viewMarcas() {
  const rows = store.marcas
    .map(
      (m) => `
      <tr>
        <td class="crud-num">${m.id}</td>
        <td>${escapeHtml(m.nome)}</td>
        <td>${tiposBadges(m.id)}</td>
        ${rowActions("marcas", m.id)}
      </tr>`,
    )
    .join("");

  return `<table class="crud-table">
      <thead><tr>
        <th>#</th>
        <th><i class="fa-solid fa-car-side"></i> Marca/Modelo</th>
        <th><i class="fa-solid fa-tags"></i> Tipos</th>
        <th></th>
      </tr></thead>
      <tbody>${rows || emptyRow(4)}</tbody>
    </table>`;
}

// ---- Aba Ordem (arrastar e soltar, por marca/modelo + tipo) ----

// Itens que se aplicam a uma marca/modelo (a qualquer tipo dela).
function itensDaMarca(marcaId) {
  const tipoIds = tiposDaMarca(marcaId).map((t) => t.id);
  return store.itens.filter((item) =>
    (item.aplicacoes || []).some((tipoId) => tipoIds.includes(tipoId)),
  );
}

// Itens da marca na ordem salva (os sem ordem definida vao para o fim).
// A ordem é por marca: vale para todos os tipos dela (USB/USA/USI são vinculados).
function itensOrdenados(marcaId) {
  const ordem = store.ordens[marcaId] || [];
  const pos = new Map(ordem.map((id, index) => [id, index]));
  return itensDaMarca(marcaId)
    .slice()
    .sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id) : Infinity;
      const pb = pos.has(b.id) ? pos.get(b.id) : Infinity;
      return pa - pb || a.id - b.id;
    });
}

// Garante uma marca/modelo válida selecionada.
function ensureOrdemCtx() {
  if (
    ui.ordem.marcaId == null ||
    !store.marcas.some((m) => m.id === ui.ordem.marcaId)
  ) {
    ui.ordem.marcaId = store.marcas[0] ? store.marcas[0].id : null;
  }
}

function viewOrdem() {
  ensureOrdemCtx();
  const ctx = ui.ordem;

  const marcaOpts = store.marcas
    .map(
      (m) =>
        `<option value="${m.id}" ${m.id === ctx.marcaId ? "selected" : ""}>${escapeHtml(m.nome)}</option>`,
    )
    .join("");
  // Tipos vinculados da marca, combinados (ex.: "USB/USA/USI").
  const tiposCombinados =
    tiposDaMarca(ctx.marcaId)
      .map((t) => escapeHtml(t.sigla))
      .join("/") || "—";

  const items = ctx.marcaId != null ? itensOrdenados(ctx.marcaId) : [];
  const rows = items
    .map(
      (it, index) => `
      <li class="crud-ordem-item" draggable="true" data-item-id="${it.id}">
        <span class="crud-ordem-num">${index + 1}</span>
        <i class="fa-solid fa-grip-vertical crud-ordem-handle"></i>
        <span class="crud-ordem-desc">${escapeHtml(it.descricao)}</span>
      </li>`,
    )
    .join("");

  return `
    <div class="crud-ordem-ctx">
      <div class="crud-ordem-field">
        <label for="crudOrdemMarca">Marca/Modelo</label>
        <select id="crudOrdemMarca">${marcaOpts || '<option value="">—</option>'}</select>
      </div>
      <div class="crud-ordem-field">
        <label>Tipos</label>
        <div class="crud-ordem-tipos" title="Tipos desta marca/modelo (mesma ordem para todos)">
          ${tiposCombinados}
        </div>
      </div>
    </div>
    <p class="crud-ordem-hint" id="crudOrdemStatus">
      <i class="fa-solid fa-lightbulb"></i> <strong>Dica:</strong> Arraste pelo <i class="fa-solid fa-grip-vertical"></i> para reordenar — salva automaticamente.
    </p>
    <ul class="crud-ordem-list" id="crudOrdemList">
      ${rows || '<li class="crud-empty crud-empty-ordem"><i class="fa-solid fa-box-open"></i><span>Nenhum item aplica-se a esta marca/modelo.</span></li>'}
    </ul>`;
}

function renumberOrdem(list) {
  [...list.querySelectorAll(".crud-ordem-item")].forEach((li, index) => {
    const num = li.querySelector(".crud-ordem-num");
    if (num) num.textContent = index + 1;
  });
}

let _ordemSavedTimer = null;

function saveOrdemFromDom() {
  const list = document.querySelector("#crudOrdemList");
  if (!list || ui.ordem.marcaId == null) return;

  store.ordens[ui.ordem.marcaId] = [
    ...list.querySelectorAll(".crud-ordem-item"),
  ].map((li) => Number(li.dataset.itemId));
  persist("ordens");

  const status = document.querySelector("#crudOrdemStatus");
  if (status) {
    clearTimeout(_ordemSavedTimer);
    status.innerHTML = '<i class="fa-solid fa-check"></i> Ordem salva.';
    status.classList.add("is-saved");

    _ordemSavedTimer = setTimeout(() => {
      status.innerHTML =
        '<i class="fa-solid fa-lightbulb"></i> <strong>Dica:</strong> Arraste pelo <i class="fa-solid fa-grip-vertical"></i> para reordenar — salva automaticamente.';
      status.classList.remove("is-saved");
    }, 2000);
  }
}

// ---- Aba Imagens (upload de frente/traseira por marca/modelo) ----

function ensureImagensCtx() {
  if (
    ui.imagens.marcaId == null ||
    !store.marcas.some((m) => m.id === ui.imagens.marcaId)
  ) {
    ui.imagens.marcaId = store.marcas[0] ? store.marcas[0].id : null;
  }
}

function viewImagens() {
  ensureImagensCtx();
  const ctx = ui.imagens;
  const marca = store.marcas.find((m) => m.id === ctx.marcaId);

  const marcaOpts = store.marcas
    .map(
      (m) =>
        `<option value="${m.id}"${m.id === ctx.marcaId ? " selected" : ""}>${escapeHtml(m.nome)}</option>`,
    )
    .join("");

  const tipos = marca
    ? (marca.tipos || [])
        .map((t) => `<span class="crud-badge">${escapeHtml(t.sigla)}</span>`)
        .join(" ")
    : "—";

  // Busca as imagens resolvidas do filesystem para esta marca
  const vehicleConfig = vehicleTypesConfig.find((c) => c.crudMarcaId === ctx.marcaId);
  const resolvedTypes = getVehicleTypes();
  const resolvedType = vehicleConfig
    ? resolvedTypes.find((t) => t.id === vehicleConfig.id)
    : null;
  const resolvedImages = resolvedType ? resolvedType.images : [];
  const fsFronte = resolvedImages.find((img) => img.label === "Frente");
  const fsTraseira = resolvedImages.find((img) => img.label === "Traseira");

  const imgs = store.imagens[ctx.marcaId] || {};

  function thumbCard(face, label, fsImage) {
    const customSrc = imgs[face];
    const src = customSrc || (fsImage ? fsImage.src : null);
    const isFs = !customSrc && !!fsImage;
    const preview = src
      ? `<div class="crud-img-wrap"><img src="${src}" alt="${label}" class="crud-img-preview" /><div class="crud-img-overlay"><i class="fa-solid fa-cloud-arrow-up"></i> Clique ou arraste para substituir</div></div>`
      : `<div class="crud-img-empty"><i class="fa-solid fa-cloud-arrow-up"></i><span>Clique ou arraste para enviar</span></div>`;
    const removeBtn = src
      ? `<button type="button" class="crud-icon-btn is-danger crud-img-remove" data-img-remove="${face}" title="Remover imagem"><i class="fa-solid fa-trash-can"></i></button>`
      : "";
    return `
      <div class="crud-img-card">
        <div class="crud-img-label">${label} ${removeBtn}</div>
        <label class="crud-img-drop" data-img-face="${face}">
          <input type="file" accept="image/*" data-img-upload="${face}" hidden />
          ${preview}
        </label>
      </div>`;
  }

  return `
    <div class="crud-ordem-ctx">
      <div class="crud-ordem-field">
        <label for="crudImagensMarca">Marca/Modelo</label>
        <select id="crudImagensMarca">${marcaOpts || '<option value="">-</option>'}</select>
      </div>
      <div class="crud-ordem-field">
        <label>Tipos</label>
        <div class="crud-ordem-tipos">${tipos}</div>
      </div>
    </div>
    <div class="crud-img-grid">
      ${thumbCard("frente", "Frente", fsFronte)}
      ${thumbCard("traseira", "Traseira", fsTraseira)}
    </div>
    <div class="crud-img-actions">
      <span id="crudImgStatus" class="crud-img-status"></span>
      <button type="button" class="crud-btn-save" id="crudImgSave">
        <i class="fa-solid fa-floppy-disk"></i> Salvar
      </button>
    </div>`;
}

const VIEWS = { itens: viewItens, marcas: viewMarcas, ordem: viewOrdem, imagens: viewImagens };

function render() {
  dom.crudBody.innerHTML = VIEWS[ui.tab]();
}

function setActiveTab() {
  dom.crudTabs.querySelectorAll(".crud-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === ui.tab);
  });
  // Abas Ordem e Imagens não criam registros: esconde o botão "Novo".
  const hideTabs = ["ordem", "imagens"];
  dom.btnCrudNew.style.display = hideTabs.includes(ui.tab) ? "none" : "";
}

// ---- Modal de formulário (Novo / Editar) ----

const FORMS = { itens: itensForm, marcas: marcasForm };

const FORM_LABELS = {
  itens: { icon: "fa-list-check", new: "Novo item", edit: "Editar item" },
  marcas: {
    icon: "fa-car-side",
    new: "Nova marca/modelo",
    edit: "Editar marca/modelo",
  },
};

function openFormModal() {
  const { entity, mode } = ui.form;
  const label = FORM_LABELS[entity];

  dom.crudFormTitle.innerHTML = `<i class="fa-solid ${label.icon}"></i> ${
    mode === "edit" ? label.edit : label.new
  }`;
  dom.crudFormBody.innerHTML = FORMS[entity]();
  dom.crudFormModal.hidden = false;

  const first = dom.crudFormBody.querySelector("input, select");
  if (first) first.focus();
}

function closeFormModal() {
  dom.crudFormModal.hidden = true;
  ui.form = null;
}

// Re-renderiza apenas o corpo do formulário (ex.: ao adicionar/remover linha).
function rerenderForm() {
  dom.crudFormBody.innerHTML = FORMS[ui.form.entity]();
}

// Preserva a descrição digitada (item) antes de re-renderizar o formulário.
function syncDescricaoToForm() {
  const el = document.querySelector("#crudDescricao");
  if (el) ui.form.data.descricao = el.value;
}

// Preserva nome + linhas de tipo (marca) antes de re-renderizar/salvar.
function syncMarcaForm() {
  const nomeEl = document.querySelector("#crudNome");
  if (nomeEl) ui.form.data.nome = nomeEl.value;

  ui.form.data.tipos = [...document.querySelectorAll(".crud-tipo-row")].map(
    (row) => ({
      id: row.dataset.tipoId ? Number(row.dataset.tipoId) : null,
      sigla: row.querySelector(".crud-tipo-sigla").value.trim(),
      nome: row.querySelector(".crud-tipo-nome").value.trim(),
    }),
  );
}

// ---- Leitura/validação de formulário ----

function fieldValue(selector) {
  const el = document.querySelector(selector);
  return el ? el.value.trim() : "";
}

function invalidate(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("is-invalid");
    el.focus();
  }
}

function showAlert(msg) {
  dom.crudAlertMsg.style.whiteSpace = "pre-line";
  dom.crudAlertMsg.textContent = msg;
  dom.crudAlertModal.hidden = false;
}

function readForm(entity, id) {
  if (entity === "itens") {
    const descricao = fieldValue("#crudDescricao");
    if (!descricao) {
      invalidate("#crudDescricao");
      return null;
    }
    const duplicado = store.itens.find(
      (it) => it.descricao.toLowerCase() === descricao.toLowerCase() && it.id !== id,
    );
    if (duplicado) {
      invalidate("#crudDescricao");
      showAlert(`Já existe um item com a descrição "${duplicado.descricao}".`);
      return null;
    }
    const aplicacoes = (ui.form.data.aplicacoes || []).slice();
    if (!aplicacoes.length) {
      const block = document.querySelector(".crud-apl");
      if (block) block.classList.add("is-invalid");
      return null;
    }
    return { id, descricao, aplicacoes };
  }

  if (entity === "marcas") {
    syncMarcaForm();
    const nome = (ui.form.data.nome || "").trim();
    if (!nome) {
      invalidate("#crudNome");
      return null;
    }

    const tipos = ui.form.data.tipos || [];
    const semSigla = tipos.findIndex((t) => !t.sigla);
    if (semSigla >= 0) {
      const inputs = document.querySelectorAll(
        ".crud-tipo-row .crud-tipo-sigla",
      );
      if (inputs[semSigla]) {
        inputs[semSigla].classList.add("is-invalid");
        inputs[semSigla].focus();
      }
      return null;
    }

    // Mantem os ids existentes (para nao quebrar as aplicacoes dos itens) e
    // atribui ids globais novos aos tipos recem-adicionados.
    let counter =
      Math.max(
        0,
        ...allTipos().map((t) => t.id),
        ...tipos.filter((t) => t.id != null).map((t) => t.id),
      ) + 1;
    const tiposFinal = tipos.map((t) =>
      t.id != null
        ? { id: t.id, sigla: t.sigla, nome: t.nome }
        : { id: counter++, sigla: t.sigla, nome: t.nome },
    );

    return { id, nome, tipos: tiposFinal };
  }

  return null;
}

// ---- Abrir / fechar ----

function openModal() {
  ui.form = null;
  setActiveTab();
  render();
  dom.crudModal.hidden = false;
}

function closeModal() {
  dom.crudModal.hidden = true;
}

let initialized = false;

export function initCrud() {
  if (initialized) return;
  initialized = true;

  dom.btnOpenCrud.addEventListener("click", openModal);
  dom.btnCloseCrud.addEventListener("click", closeModal);

  dom.crudModal.addEventListener("click", (event) => {
    if (event.target === dom.crudModal) closeModal();
  });

  // Modal de alerta
  const closeAlert = () => { dom.crudAlertModal.hidden = true; };
  dom.btnCloseAlert.addEventListener("click", closeAlert);
  dom.btnAlertOk.addEventListener("click", closeAlert);
  dom.crudAlertModal.addEventListener("click", (event) => {
    if (event.target === dom.crudAlertModal) closeAlert();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!dom.crudAlertModal.hidden) closeAlert();
    else if (!dom.crudFormModal.hidden) closeFormModal();
    else if (!dom.crudModal.hidden) closeModal();
  });

  dom.crudTabs.addEventListener("click", (event) => {
    // Botão "Novo" (na barra de abas): cria um registro da aba atual.
    if (event.target.closest(".crud-btn-new")) {
      if (ui.tab === "ordem" || ui.tab === "imagens") return;
      ui.form = { entity: ui.tab, mode: "new", data: {} };
      openFormModal();
      return;
    }

    const tab = event.target.closest(".crud-tab");
    if (!tab) return;
    ui.tab = tab.dataset.tab;
    ui.form = null;
    setActiveTab();
    render();
  });

  // Aba Ordem: troca de contexto (marca/modelo).
  // Aba Imagens: troca de marca e upload de imagens.
  dom.crudBody.addEventListener("change", (event) => {
    if (event.target.id === "crudOrdemMarca") {
      ui.ordem.marcaId = Number(event.target.value) || null;
      render();
    }
    if (event.target.id === "crudImagensMarca") {
      ui.imagens.marcaId = Number(event.target.value) || null;
      render();
    }
    // Upload de imagem (frente/traseira)
    const uploadInput = event.target.closest("[data-img-upload]");
    if (uploadInput && uploadInput.files && uploadInput.files[0]) {
      const face = uploadInput.dataset.imgUpload;
      const file = uploadInput.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const marcaId = ui.imagens.marcaId;
        if (marcaId == null) return;
        if (!store.imagens[marcaId]) store.imagens[marcaId] = {};
        store.imagens[marcaId][face] = reader.result;
        persist("imagens");
        render();
      };
      reader.readAsDataURL(file);
    }
  });

  // Aba Imagens: drag-and-drop de arquivos na área de upload.
  dom.crudBody.addEventListener("dragover", (event) => {
    const drop = event.target.closest(".crud-img-drop");
    if (drop) {
      event.preventDefault();
      drop.classList.add("is-dragover");
    }
  });

  dom.crudBody.addEventListener("dragleave", (event) => {
    const drop = event.target.closest(".crud-img-drop");
    if (drop) drop.classList.remove("is-dragover");
  });

  dom.crudBody.addEventListener("drop", (event) => {
    const drop = event.target.closest(".crud-img-drop");
    if (!drop) return;
    event.preventDefault();
    drop.classList.remove("is-dragover");

    const face = drop.dataset.imgFace;
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const marcaId = ui.imagens.marcaId;
      if (marcaId == null) return;
      if (!store.imagens[marcaId]) store.imagens[marcaId] = {};
      store.imagens[marcaId][face] = reader.result;
      persist("imagens");
      render();
    };
    reader.readAsDataURL(file);
  });

  // Aba Ordem: arrastar e soltar para reordenar (salva automaticamente).
  let dragItem = null;

  dom.crudBody.addEventListener("dragstart", (event) => {
    const li = event.target.closest(".crud-ordem-item");
    if (!li) return;
    dragItem = li;
    li.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData("text/plain", li.dataset.itemId);
      } catch {
        // alguns navegadores limitam setData fora de gestos reais
      }
    }
  });

  dom.crudBody.addEventListener("dragover", (event) => {
    if (!dragItem) return;
    const list = event.target.closest("#crudOrdemList");
    if (!list) return;
    event.preventDefault();

    const li = event.target.closest(".crud-ordem-item");
    if (!li || li === dragItem) return;

    const rect = li.getBoundingClientRect();
    const depois = event.clientY - rect.top > rect.height / 2;
    list.insertBefore(dragItem, depois ? li.nextSibling : li);
    renumberOrdem(list);
  });

  dom.crudBody.addEventListener("drop", (event) => {
    if (dragItem && event.target.closest("#crudOrdemList")) event.preventDefault();
  });

  dom.crudBody.addEventListener("dragend", () => {
    if (!dragItem) return;
    dragItem.classList.remove("is-dragging");
    dragItem = null;
    saveOrdemFromDom();
  });

  dom.crudBody.addEventListener("click", (event) => {
    // Aba Imagens: remover imagem
    const removeBtn = event.target.closest("[data-img-remove]");
    if (removeBtn) {
      const face = removeBtn.dataset.imgRemove;
      const marcaId = ui.imagens.marcaId;
      if (marcaId != null && store.imagens[marcaId]) {
        delete store.imagens[marcaId][face];
        persist("imagens");
        render();
      }
      return;
    }

    // Aba Imagens: botão Salvar (protótipo — sem ação real)
    if (event.target.closest("#crudImgSave")) {
      const status = document.querySelector("#crudImgStatus");
      const btn = document.querySelector("#crudImgSave");
      if (status) {
        status.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
        status.classList.add("is-saved");
      }
      if (btn) {
        btn.classList.add("is-saved");
      }
      setTimeout(() => {
        if (status) {
          status.textContent = "";
          status.classList.remove("is-saved");
        }
        if (btn) btn.classList.remove("is-saved");
      }, 2000);
      return;
    }

    const editBtn = event.target.closest("[data-edit]");
    if (editBtn) {
      const entity = editBtn.dataset.edit;
      const id = Number(editBtn.dataset.id);
      const record = store[entity].find((item) => item.id === id);
      if (record) {
        const data = { ...record };
        if (data.aplicacoes) data.aplicacoes = data.aplicacoes.slice();
        if (data.tipos) data.tipos = data.tipos.map((t) => ({ ...t }));
        ui.form = { entity, mode: "edit", data };
        openFormModal();
      }
      return;
    }

    const delBtn = event.target.closest("[data-del]");
    if (delBtn) {
      const entity = delBtn.dataset.del;
      const id = Number(delBtn.dataset.id);

      // Integridade: nao excluir marca/modelo que esteja aplicada por itens.
      if (entity === "marcas" && itensComMarca(id) > 0) {
        const marca = store.marcas.find((m) => m.id === id);
        const vinculados = store.itens
          .filter((it) =>
            (it.aplicacoes || []).some((tipoId) => tipoMarcaId(tipoId) === id),
          )
          .map((it) => it.descricao)
          .join(", ");
        showAlert(
          `Não é possível excluir "${marca ? marca.nome : ""}": está vinculada aos itens: ${vinculados}.\n\nPara excluir, primeiro desvincule na aba Itens.`,
        );
        return;
      }

      if (window.confirm("Excluir este registro?")) {
        remove(entity, id);
        render();
      }
      return;
    }
  });

  // Modal de formulário (Novo / Editar)
  dom.btnCloseCrudForm.addEventListener("click", closeFormModal);

  dom.crudFormModal.addEventListener("click", (event) => {
    if (event.target === dom.crudFormModal) closeFormModal();
  });

  dom.crudFormBody.addEventListener("click", (event) => {
    if (event.target.closest("[data-crud-cancel]")) {
      closeFormModal();
      return;
    }

    // --- Item: aplicações por marca (a marca já traz seus tipos) ---
    if (event.target.closest("[data-apl-add]")) {
      syncDescricaoToForm();
      const marcaSel = document.querySelector("#crudAplMarca");
      const marcaId = Number(marcaSel ? marcaSel.value : "") || null;
      if (marcaId) {
        const lista = ui.form.data.aplicacoes || (ui.form.data.aplicacoes = []);
        tiposDaMarca(marcaId).forEach((t) => {
          if (!lista.includes(t.id)) lista.push(t.id);
        });
        rerenderForm();
      }
      return;
    }

    const aplDel = event.target.closest("[data-apl-del]");
    if (aplDel) {
      syncDescricaoToForm();
      const marcaId = Number(aplDel.dataset.aplDel);
      ui.form.data.aplicacoes = (ui.form.data.aplicacoes || []).filter(
        (tipoId) => tipoMarcaId(tipoId) !== marcaId,
      );
      rerenderForm();
      return;
    }

    // --- Marca/Modelo: tipos embutidos ---
    if (event.target.closest("[data-tipo-add]")) {
      syncMarcaForm();
      const lista = ui.form.data.tipos || (ui.form.data.tipos = []);
      lista.push({ id: null, sigla: "", nome: "" });
      rerenderForm();
      return;
    }

    const tipoDel = event.target.closest("[data-tipo-del]");
    if (tipoDel) {
      syncMarcaForm();
      const index = Number(tipoDel.dataset.tipoDel);
      const tipo = ui.form.data.tipos[index];
      if (tipo && tipo.id != null && itensComTipo(tipo.id) > 0) {
        const marcaNomeAtual = ui.form.data.nome || "";
        const vinculados = store.itens
          .filter((it) => (it.aplicacoes || []).includes(tipo.id))
          .map((it) => it.descricao)
          .join(", ");
        showAlert(
          `Não é possível remover "${marcaNomeAtual} (${tipo.sigla})": está vinculado aos itens: ${vinculados}.\n\nPara remover, primeiro desvincule na aba Itens.`,
        );
        return;
      }
      ui.form.data.tipos.splice(index, 1);
      rerenderForm();
    }
  });

  dom.crudFormBody.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target.closest(".crud-form");
    if (!form) return;

    const entity = form.dataset.entity;
    const id = form.dataset.id ? Number(form.dataset.id) : null;
    const data = readForm(entity, id);
    if (!data) return;

    save(entity, data);
    closeFormModal();
    render();
  });
}

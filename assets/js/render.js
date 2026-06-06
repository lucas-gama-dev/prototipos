import { dom } from "./dom.js";
import {
  activeImage,
  allTypePoints,
  currentImages,
  currentType,
  getVehicleTypes,
  hasPointPosition,
  imagePoints,
  state,
} from "./state.js";
import { escapeHtml, formatPercent } from "./utils.js";

let lastMapStructureKey = "";

export function resetMapStructure() {
  lastMapStructureKey = "";
}

export function populateTypeSelect() {
  dom.typeSelect.innerHTML = getVehicleTypes()
    .map((type) => `<option value="${type.id}">${type.label}</option>`)
    .join("");
  dom.typeSelect.value = state.selectedTypeId;
}

function renderImageTabs() {
  dom.imageTabs.innerHTML = currentImages()
    .map((image, index) => {
      const active = index === state.activeImageIndex ? " is-active" : "";
      return `<button class="tab-btn${active}" type="button" data-tab="${index}">${image.label}</button>`;
    })
    .join("");
}

function renderViewMode() {
  dom.modeSingle.classList.toggle("is-active", state.viewMode === "single");
  dom.modeDual.classList.toggle("is-active", state.viewMode === "dual");
}

function markerHTML(point, coords, isExtra = false) {
  const selected =
    point.id === state.selectedPointId && !isExtra ? " is-selected" : "";
  const extraClass = isExtra ? " is-extra" : "";

  return `
    <button
      class="marker${selected}${extraClass}"
      style="--x:${coords.x};--y:${coords.y}"
      type="button"
      data-id="${point.id}"
      data-label="${point.descricao}"
      aria-label="Ponto ${point.id}: ${point.descricao}"
    >${point.id}</button>
  `;
}

function markersHTML(imageIndex) {
  return imagePoints(imageIndex)
    .flatMap((point) => {
      const markers = [markerHTML(point, point)];

      if (Array.isArray(point.extras)) {
        markers.push(
          ...point.extras.map((extra) => markerHTML(point, extra, true)),
        );
      }

      return markers;
    })
    .join("");
}

function mapFrameHTML(image, index) {
  const isActive = index === state.activeImageIndex;

  return `
    <div class="map-frame${isActive ? " is-active" : ""}" data-frame="${index}">
      <div class="map-frame-label">${image.label}</div>
      <div class="map-wrap">
        <div class="map" data-map="${index}" aria-label="Mapa cartesiano - ${image.label}">
          <div class="axis-label axis-origin">(0,0)</div>
          <div class="axis-label axis-x">X &rarr; (100,0)</div>
          <div class="axis-label axis-y">Y &darr;</div>
          <div class="axis-label axis-y-end">(0,100)</div>
          <div class="axis-label axis-end">(100,100)</div>
          <div class="tick tick-x tick-x-25">25</div>
          <div class="tick tick-x tick-x-50">50</div>
          <div class="tick tick-x tick-x-75">75</div>
          <div class="tick tick-y tick-y-25">25</div>
          <div class="tick tick-y tick-y-50">50</div>
          <div class="tick tick-y tick-y-75">75</div>
          <img src="${image.src}" alt="Viatura SAMU - ${image.label}" />
          <div class="markers">${markersHTML(index)}</div>
          <div class="cursor-tooltip" hidden></div>
        </div>
      </div>
    </div>
  `;
}

function getMapStructureKey() {
  const imageKey =
    state.viewMode === "single" ? state.activeImageIndex : "all";
  return `${state.selectedTypeId}|${state.viewMode}|${imageKey}`;
}

function renderMaps() {
  const key = getMapStructureKey();
  const structureChanged = key !== lastMapStructureKey;
  lastMapStructureKey = key;

  if (structureChanged) {
    const isDual = state.viewMode === "dual";
    dom.mapsContainer.className = `maps-container ${isDual ? "mode-dual" : "mode-single"}`;

    dom.mapsContainer.innerHTML = isDual
      ? currentImages()
          .map((image, index) => mapFrameHTML(image, index))
          .join("")
      : mapFrameHTML(activeImage(), state.activeImageIndex);

    applyMapAspects();
    return;
  }

  updateMarkersInPlace();
}

// Define o aspecto do mapa e a largura proporcional do quadro a partir das
// dimensoes naturais da imagem. No modo lado a lado, larguras proporcionais ao
// aspecto resultam em alturas iguais (sem distorcer as imagens).
function applyImageAspect(img) {
  const mapEl = img.closest(".map");
  if (!mapEl) return;

  const { naturalWidth: width, naturalHeight: height } = img;
  if (!width || !height) return;

  mapEl.style.setProperty("--map-aspect", `${width} / ${height}`);

  const frame = mapEl.closest(".map-frame");
  if (frame) frame.style.setProperty("--map-grow", String(width / height));
}

// Aplica o aspecto a cada imagem usando naturalWidth/Height (nao depende de
// "complete"/"load"/"decode", que sao pouco confiaveis para imagens em cache).
function applyMapAspects() {
  dom.mapsContainer.querySelectorAll(".map img").forEach((img) => {
    if (img.naturalWidth) {
      applyImageAspect(img);
      return;
    }

    // Imagem ainda carregando: o evento "load" cobre o caso normal.
    img.addEventListener("load", () => applyImageAspect(img), { once: true });

    // Algumas imagens em cache populam naturalWidth sem disparar "load" (e sem
    // ficar "complete"), entao tambem verificamos por alguns frames.
    let frames = 0;
    const poll = () => {
      if (img.naturalWidth) applyImageAspect(img);
      else if (++frames < 40) requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
}

function updateMarkersInPlace() {
  const images = currentImages();

  dom.mapsContainer.querySelectorAll(".map-frame").forEach((frame) => {
    const index = Number(frame.dataset.frame);
    const image = images[index];
    if (!image) return;

    frame.classList.toggle("is-active", index === state.activeImageIndex);

    const markersEl = frame.querySelector(".markers");
    if (markersEl) {
      markersEl.innerHTML = markersHTML(index);
    }
  });
}

function pointActionHTML(point, positioned) {
  if (positioned) {
    return `<button class="table-action is-clear" type="button" data-clear-position="${point.id}" aria-label="Limpar posicao do ponto ${point.id}" title="Limpar posicao"><i class="fa-solid fa-trash-can"></i></button>`;
  }

  return `<button class="table-action is-add" type="button" data-place="${point.id}" aria-label="Posicionar ponto ${point.id}" title="Posicionar"><i class="fa-solid fa-plus"></i></button>`;
}

function renderTable() {
  dom.tableBody.innerHTML = allTypePoints()
    .map((point) => {
      const positioned = hasPointPosition(point);
      const rowClasses = [
        point.id === state.selectedPointId ? "is-selected" : "",
        positioned ? "is-positioned" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const selected = rowClasses ? ` class="${rowClasses}"` : "";
      const x = positioned ? formatPercent(point.x) : "-";
      const y = positioned ? formatPercent(point.y) : "-";

      return `
        <tr${selected} data-id="${point.id}">
          <td><strong>${point.id}</strong></td>
          <td>${point.descricao}</td>
          <td class="${positioned ? "" : "coord-empty"}">${x}</td>
          <td class="${positioned ? "" : "coord-empty"}">${y}</td>
          <td>${pointActionHTML(point, positioned)}</td>
        </tr>
      `;
    })
    .join("");
}

export function renderJson() {
  const type = currentType();
  const images = currentImages();

  if (!type) {
    dom.jsonOutput.textContent = "{}";
    return;
  }

  const payload = {
    tipo: { id: type.id, label: type.label },
    origem: "canto-superior-esquerdo",
    escala: "percentual-0-100",
    imagens: images.map((image, index) => ({
      ...image,
      pontos: imagePoints(index).map((point) => ({
        id: point.id,
        descricao: point.descricao,
        x: Number(point.x),
        y: Number(point.y),
        extras: point.extras,
      })),
    })),
  };

  dom.jsonOutput.textContent = JSON.stringify(payload, null, 2);
}

// ---- Simulacao de armazenamento em banco (MySQL) ----

const DB_TABLE = "checklist_pontos_viatura";

const DB_DDL = `CREATE TABLE \`${DB_TABLE}\` (
  \`id\`                 INT UNSIGNED              NOT NULL AUTO_INCREMENT, -- PK sintetica (simulada 1..34 no prototipo)
  \`viatura_tipo_id\`    VARCHAR(40)               NOT NULL,                -- FK -> viaturas_tipos.id (ex.: 'mercedes-sprinter-usb')
  \`viatura_tipo_label\` VARCHAR(80)               NOT NULL,                -- desnormalizado p/ leitura
  \`ordem\`              TINYINT UNSIGNED          NOT NULL,                -- n de ordem do checklist (1..34) = point.id
  \`descricao\`          VARCHAR(120)              NOT NULL,                -- point.descricao
  \`image_index\`        TINYINT UNSIGNED          DEFAULT NULL,            -- 0=Frente, 1=Traseira
  \`imagem_face\`        ENUM('frente','traseira') DEFAULT NULL,            -- derivado de images[image_index].label
  \`pos_x\`              DECIMAL(5,2)              DEFAULT NULL,            -- 0.00..100.00
  \`pos_y\`              DECIMAL(5,2)              DEFAULT NULL,
  \`extras_json\`        JSON                      DEFAULT NULL,            -- array [{x,y}] de pontos adicionais
  \`posicionado\`        TINYINT(1)                NOT NULL DEFAULT 0,      -- flag derivada (espelha hasPointPosition)
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_viatura_ordem\` (\`viatura_tipo_id\`, \`ordem\`),
  KEY \`idx_posicionado\` (\`viatura_tipo_id\`, \`posicionado\`),
  CONSTRAINT \`fk_pcv_viatura\` FOREIGN KEY (\`viatura_tipo_id\`) REFERENCES \`viaturas_tipos\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

const DB_COLUMNS = [
  { name: "id", type: "int unsigned", cls: "is-pk", icon: "fa-key", title: "PK · AUTO_INCREMENT" },
  { name: "viatura_tipo_id", type: "varchar(40)", cls: "is-fk", icon: "fa-link", title: "FK → viaturas_tipos.id" },
  { name: "viatura_tipo_label", type: "varchar(80)" },
  { name: "ordem", type: "tinyint unsigned", title: "UNIQUE(viatura_tipo_id, ordem)" },
  { name: "descricao", type: "varchar(120)" },
  { name: "image_index", type: "tinyint unsigned" },
  { name: "imagem_face", type: "enum('frente','traseira')" },
  { name: "pos_x", type: "decimal(5,2)" },
  { name: "pos_y", type: "decimal(5,2)" },
  { name: "extras_json", type: "json" },
  { name: "posicionado", type: "tinyint(1)" },
];

// Calcula os valores de uma linha (1 ponto) conforme o esquema do banco.
function dbRowValues(point, index, type, images) {
  const positioned = hasPointPosition(point);
  const imageIndex = positioned ? point.imageIndex : null;
  const face =
    positioned && images[imageIndex]
      ? images[imageIndex].label.toLowerCase()
      : null;

  return {
    id: index + 1,
    viatura_tipo_id: type.id,
    viatura_tipo_label: type.label,
    ordem: point.id,
    descricao: point.descricao,
    image_index: imageIndex,
    imagem_face: face,
    pos_x: positioned ? Number(point.x).toFixed(2) : null,
    pos_y: positioned ? Number(point.y).toFixed(2) : null,
    extras_json:
      point.extras && point.extras.length ? JSON.stringify(point.extras) : null,
    posicionado: positioned,
  };
}

export function renderDbView() {
  const type = currentType();

  if (!type) {
    dom.dbView.innerHTML = "";
    dom.dbStatusbar.textContent = "";
    return;
  }

  dom.dbDdl.textContent = DB_DDL;

  const images = currentImages();
  const points = allTypePoints();

  const headNames = DB_COLUMNS.map((col) => {
    const icon = col.icon ? `<i class="fa-solid ${col.icon}"></i> ` : "";
    return `<th class="${col.cls || ""}" title="${col.title || col.name}">${icon}${col.name}</th>`;
  }).join("");

  const headTypes = DB_COLUMNS.map((col) => `<th>${col.type}</th>`).join("");

  const nullCell = `<td class="db-null-cell"><span class="db-null">NULL</span></td>`;
  const num = (value) =>
    value == null ? nullCell : `<td class="db-num">${value}</td>`;

  const tbody = points
    .map((point, index) => {
      const row = dbRowValues(point, index, type, images);
      const cells = [
        `<td class="db-num db-pk">${row.id}</td>`,
        `<td class="db-fk">${escapeHtml(row.viatura_tipo_id)}</td>`,
        `<td>${escapeHtml(row.viatura_tipo_label)}</td>`,
        num(row.ordem),
        `<td>${escapeHtml(row.descricao)}</td>`,
        num(row.image_index),
        row.imagem_face == null
          ? nullCell
          : `<td><span class="db-enum">${escapeHtml(row.imagem_face)}</span></td>`,
        num(row.pos_x),
        num(row.pos_y),
        row.extras_json == null
          ? nullCell
          : `<td class="db-json" title="${escapeHtml(row.extras_json)}">${escapeHtml(row.extras_json)}</td>`,
        `<td><span class="db-bool ${row.posicionado ? "is-on" : "is-off"}">${row.posicionado ? 1 : 0}</span></td>`,
      ].join("");

      return `<tr class="${row.posicionado ? "" : "row-null"}">${cells}</tr>`;
    })
    .join("");

  dom.dbView.innerHTML =
    `<thead><tr class="db-colnames">${headNames}</tr><tr class="db-coltypes">${headTypes}</tr></thead>` +
    `<tbody>${tbody}</tbody>`;

  const total = points.length;
  const positionedCount = points.filter(hasPointPosition).length;
  dom.dbStatusbar.innerHTML =
    `<span>${total} rows in set</span> &middot; ` +
    `<span class="db-ok">${positionedCount} posicionadas</span> &middot; ` +
    `<span>${total - positionedCount} NULL</span>`;
}

// Gera DDL + INSERTs equivalentes (para o botao "Copiar SQL").
export function buildDbSql() {
  const type = currentType();
  if (!type) return DB_DDL;

  const images = currentImages();
  const points = allTypePoints();
  const quote = (value) =>
    value == null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;
  const raw = (value) => (value == null ? "NULL" : value);

  const values = points
    .map((point, index) => {
      const row = dbRowValues(point, index, type, images);
      return (
        `  (${row.id}, ${quote(row.viatura_tipo_id)}, ${quote(row.viatura_tipo_label)}, ` +
        `${row.ordem}, ${quote(row.descricao)}, ${raw(row.image_index)}, ${quote(row.imagem_face)}, ` +
        `${raw(row.pos_x)}, ${raw(row.pos_y)}, ${quote(row.extras_json)}, ${row.posicionado ? 1 : 0})`
      );
    })
    .join(",\n");

  return (
    `${DB_DDL}\n\n` +
    `INSERT INTO \`${DB_TABLE}\`\n` +
    "  (`id`, `viatura_tipo_id`, `viatura_tipo_label`, `ordem`, `descricao`, " +
    "`image_index`, `imagem_face`, `pos_x`, `pos_y`, `extras_json`, `posicionado`)\n" +
    `VALUES\n${values};\n`
  );
}

function renderCount() {
  const points = allTypePoints();
  const total = points.length;
  const positioned = points.filter(hasPointPosition).length;
  dom.count.textContent = `${positioned}/${total}`;

  const percent = total ? Math.round((positioned / total) * 100) : 0;
  dom.progressBar.style.width = `${percent}%`;
  dom.progress.setAttribute("aria-valuenow", String(percent));
}

export function render() {
  renderImageTabs();
  renderViewMode();
  renderMaps();
  renderTable();
  renderJson();
  renderDbView();
  renderCount();
}

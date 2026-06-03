/* ═══════════════════════════════════════════════════════════════════
   Mapeamento Cartesiano – Checklist de Viaturas SAMU
   ═══════════════════════════════════════════════════════════════════ */

/* ── Catálogo de Veículos ── */

const vehicleTypes = [
  {
    id: "mercedes-sprinter-usb",
    label: "Mercedes Sprinter USB/USA/USI",
    images: [
      { id: "mercedes-sprinter-v2-frente", label: "Frente/Lateral", src: "./MERCEDES-SPRINTER-USB-USA-USI/V2-MERCEDES-SPRINTER-FRENTE.jpg" },
      { id: "mercedes-sprinter-v2-traseira", label: "Traseira", src: "./MERCEDES-SPRINTER-USB-USA-USI/V2-MERCEDES-SPRINTER-TRASEIRA.jpg" },
    ],
  },
  {
    id: "renault-master-usb",
    label: "Renault Master USB/USA/USI",
    images: [
      { id: "renault-master-v1-frente", label: "Frente/Lateral", src: "./RENAULT-MASTER-USB-USA-USI/V1-RENAULT-MASTER-FRENTE.png" },
      { id: "renault-master-v1-traseira", label: "Traseira", src: "./RENAULT-MASTER-USB-USA-USI/V1-RENAULT-MASTER-TRASEIRA.png" },
    ],
  },
  {
    id: "toyota-sw4",
    label: "Toyota SW4 VIR/VIM",
    images: [
      { id: "toyota-sw4-v3-frente", label: "Frente", src: "./TOYOTA-SW4-VIR-VIM/V3-TOYOTA-SW4-FRENTE.png" },
      { id: "toyota-sw4-v3-traseira", label: "Traseira", src: "./TOYOTA-SW4-VIR-VIM/V3-TOYOTA-SW4-TRASEIRA.png" },
    ],
  },
  {
    id: "yamaha-versys",
    label: "Yamaha Versys Motolância",
    images: [
      { id: "yamaha-versys-v1-frente", label: "Frente", src: "./YAMAHA-VERSYS-MOTOLANCIA/V1-YAMAHA-VERSYS-FRENTE.png" },
      { id: "yamaha-versys-v1-traseira", label: "Traseira", src: "./YAMAHA-VERSYS-MOTOLANCIA/V1-YAMAHA-VERSYS-TRASEIRA.png" },
    ],
  },
];

const defaultChecklist = [
  { id: 1, descricao: "Sinalizador Frontal", x: 50, y: 6, status: "pendente" },
  { id: 2, descricao: "Texto SAMU 192", x: 48, y: 13, status: "pendente" },
  { id: 3, descricao: "Parabrisa", x: 23, y: 28, status: "pendente" },
  { id: 4, descricao: "Retrovisor Lado Dir.", x: 66, y: 42, status: "pendente" },
  { id: 5, descricao: "S\u00edmbolo no Cap\u00f4", x: 32, y: 47, status: "pendente" },
  { id: 6, descricao: "Farol Dianteiro Dir.", x: 18, y: 59, status: "pendente" },
  { id: 7, descricao: "Grade Frontal", x: 33, y: 64, status: "pendente" },
  { id: 8, descricao: "Parachoque Dianteiro", x: 21, y: 74, status: "pendente" },
  { id: 9, descricao: "Placa SAMU192", x: 24, y: 83, status: "pendente" },
  { id: 10, descricao: "Roda Dianteira Dir.", x: 61, y: 82, status: "pendente" },
  { id: 11, descricao: "Sinalizador Lateral", x: 82, y: 12, status: "pendente" },
  { id: 12, descricao: "S\u00edmbolo Lateral", x: 82, y: 32, status: "pendente" },
  {
    id: 13,
    descricao: "Faixa Lateral",
    x: 83,
    y: 62,
    status: "pendente",
    extras: [{ x: 72, y: 69 }],
  },
  { id: 14, descricao: "Saia Lateral", x: 86, y: 75, status: "pendente" },
];

const storageKey = "samu-cartesian-checklist-v3";

/* ── DOM ── */

const dom = {
  typeSelect: document.querySelector("#typeSelect"),
  imageTitle: document.querySelector("#imageTitle"),
  imageMeta: document.querySelector("#imageMeta"),
  mapsContainer: document.querySelector("#mapsContainer"),
  imageTabs: document.querySelector("#imageTabs"),
  modeSingle: document.querySelector("#modeSingle"),
  modeDual: document.querySelector("#modeDual"),
  liveCoords: document.querySelector("#liveCoords"),
  resetPoints: document.querySelector("#resetPoints"),
  clearSelection: document.querySelector("#clearSelection"),
  count: document.querySelector("#count"),
  form: document.querySelector("#pointForm"),
  descricao: document.querySelector("#descricao"),
  x: document.querySelector("#x"),
  y: document.querySelector("#y"),
  status: document.querySelector("#status"),
  submitPoint: document.querySelector("#submitPoint"),
  tableBody: document.querySelector("#tableBody"),
  jsonOutput: document.querySelector("#jsonOutput"),
};

/* ── Estado ── */

const state = {
  selectedTypeId: vehicleTypes[0].id,
  activeImageIndex: 0,
  viewMode: "single",
  selectedPointId: null,
  pointsByType: loadState(),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state.pointsByType));
}

/* ── Helpers ── */

function currentType() {
  return vehicleTypes.find((t) => t.id === state.selectedTypeId) || vehicleTypes[0];
}

function currentImages() {
  return currentType().images;
}

function activeImage() {
  return currentImages()[state.activeImageIndex] || currentImages()[0];
}

function activeImageId() {
  return activeImage().id;
}

function cloneDefaultPoints() {
  return defaultChecklist.map((p) => ({
    ...p,
    imageIndex: 0,
    extras: p.extras ? p.extras.map((e) => ({ ...e })) : undefined,
  }));
}

function allTypePoints() {
  const typeId = state.selectedTypeId;
  if (!state.pointsByType[typeId]) {
    state.pointsByType[typeId] = cloneDefaultPoints();
  }
  return state.pointsByType[typeId];
}

function imagePoints(imageIndex) {
  return allTypePoints().filter((p) => p.imageIndex === imageIndex);
}

function currentPoints() {
  return imagePoints(state.activeImageIndex);
}

function clamp(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function formatPercent(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function nextId() {
  const ids = allTypePoints().map((p) => Number(p.id) || 0);
  return Math.max(0, ...ids) + 1;
}

/* ── Rendering ── */

function populateTypeSelect() {
  dom.typeSelect.innerHTML = vehicleTypes
    .map((t) => `<option value="${t.id}">${t.label}</option>`)
    .join("");
  dom.typeSelect.value = state.selectedTypeId;
}

function renderImageTabs() {
  const images = currentImages();
  dom.imageTabs.innerHTML = images
    .map((img, i) => {
      const active = i === state.activeImageIndex ? " is-active" : "";
      return `<button class="tab-btn${active}" type="button" data-tab="${i}">${img.label}</button>`;
    })
    .join("");
  dom.imageTabs.classList.toggle("is-hidden", state.viewMode === "dual");
}

function renderViewMode() {
  dom.modeSingle.classList.toggle("is-active", state.viewMode === "single");
  dom.modeDual.classList.toggle("is-active", state.viewMode === "dual");
}

function markerHTML(point, coords, isExtra = false) {
  const selected = point.id === state.selectedPointId && !isExtra ? " is-selected" : "";
  const extraClass = isExtra ? " is-extra" : "";
  const label = `${point.descricao} - X ${formatPercent(coords.x)} / Y ${formatPercent(coords.y)}`;
  return `
    <button
      class="marker status-${point.status}${selected}${extraClass}"
      style="--x:${coords.x};--y:${coords.y}"
      type="button"
      data-id="${point.id}"
      data-label="${label}"
      aria-label="Ponto ${point.id}: ${label}"
    >${point.id}</button>
  `;
}

function markersHTML(imgIndex) {
  return imagePoints(imgIndex)
    .flatMap((point) => {
      const markers = [markerHTML(point, point)];
      if (Array.isArray(point.extras)) {
        markers.push(...point.extras.map((extra) => markerHTML(point, extra, true)));
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
        <div class="map" data-map="${index}" aria-label="Mapa cartesiano \u2013 ${image.label}">
          <div class="axis-label axis-origin">(0,0)</div>
          <div class="axis-label axis-x">X \u2192 (100,0)</div>
          <div class="axis-label axis-y">Y \u2193 (0,100)</div>
          <div class="axis-label axis-end">(100,100)</div>
          <div class="tick tick-x tick-x-25">25</div>
          <div class="tick tick-x tick-x-50">50</div>
          <div class="tick tick-x tick-x-75">75</div>
          <div class="tick tick-y tick-y-25">25</div>
          <div class="tick tick-y tick-y-50">50</div>
          <div class="tick tick-y tick-y-75">75</div>
          <img src="${image.src}" alt="Viatura SAMU \u2013 ${image.label}" />
          <div class="markers">${markersHTML(index)}</div>
          <div class="cursor-tooltip" hidden></div>
        </div>
      </div>
    </div>
  `;
}

/* Chave que identifica quando a estrutura do mapa precisa ser recriada */
let lastMapStructureKey = "";

function getMapStructureKey() {
  return `${state.selectedTypeId}|${state.viewMode}|${state.viewMode === "single" ? state.activeImageIndex : "all"}`;
}

function renderMaps() {
  const key = getMapStructureKey();
  const structureChanged = key !== lastMapStructureKey;
  lastMapStructureKey = key;

  if (structureChanged) {
    const isDual = state.viewMode === "dual";
    dom.mapsContainer.className = `maps-container ${isDual ? "mode-dual" : "mode-single"}`;

    if (isDual) {
      dom.mapsContainer.innerHTML = currentImages()
        .map((img, i) => mapFrameHTML(img, i))
        .join("");
    } else {
      dom.mapsContainer.innerHTML = mapFrameHTML(activeImage(), state.activeImageIndex);
    }
  } else {
    updateMarkersInPlace();
  }
}

function updateMarkersInPlace() {
  const images = currentImages();
  dom.mapsContainer.querySelectorAll(".map-frame").forEach((frame) => {
    const idx = Number(frame.dataset.frame);
    const image = images[idx];
    if (!image) return;

    frame.classList.toggle("is-active", idx === state.activeImageIndex);

    const markersEl = frame.querySelector(".markers");
    if (markersEl) {
      markersEl.innerHTML = markersHTML(idx);
    }
  });
}

function renderTable() {
  dom.tableBody.innerHTML = currentPoints()
    .map((point) => {
      const selected = point.id === state.selectedPointId ? ' class="is-selected"' : "";
      return `
        <tr${selected} data-id="${point.id}">
          <td><strong>${point.id}</strong></td>
          <td>${point.descricao}</td>
          <td>${formatPercent(point.x)}</td>
          <td>${formatPercent(point.y)}</td>
          <td><button class="table-action" type="button" data-remove="${point.id}" aria-label="Remover ponto ${point.id}">x</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderJson() {
  const images = currentImages();
  const payload = {
    tipo: { id: currentType().id, label: currentType().label },
    origem: "canto-superior-esquerdo",
    escala: "percentual-0-100",
    imagens: images.map((img, i) => ({
      ...img,
      pontos: imagePoints(i).map((point) => ({
        id: point.id,
        descricao: point.descricao,
        x: Number(point.x),
        y: Number(point.y),
        status: point.status,
        extras: point.extras,
      })),
    })),
  };
  dom.jsonOutput.textContent = JSON.stringify(payload, null, 2);
}

function renderCount() {
  dom.count.textContent = currentPoints().length;
}

function renderForm() {
  const selected = allTypePoints().find((p) => p.id === state.selectedPointId);
  if (!selected) {
    dom.submitPoint.textContent = "Adicionar ponto";
    return;
  }
  dom.descricao.value = selected.descricao;
  dom.x.value = selected.x;
  dom.y.value = selected.y;
  dom.status.value = selected.status;
  dom.submitPoint.textContent = "Atualizar ponto";
}

function render() {
  dom.imageTitle.textContent = currentType().label;
  dom.imageMeta.textContent = `${activeImage().label} \u2013 Coordenadas em percentual`;
  renderImageTabs();
  renderViewMode();
  renderMaps();
  renderTable();
  renderJson();
  renderCount();
  renderForm();
}

/* ── Ações ── */

function selectPoint(id) {
  state.selectedPointId = Number(id);
  render();
}

function clearSelection() {
  state.selectedPointId = null;
  dom.form.reset();
  dom.status.value = "pendente";
  dom.submitPoint.textContent = "Adicionar ponto";
  render();
}

function updateLiveCoords(coords) {
  dom.liveCoords.textContent = `X ${formatPercent(coords.x)} / Y ${formatPercent(coords.y)}`;
}

function coordsFromEvent(event, mapEl) {
  const rect = mapEl.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100),
  };
}

function fillCoords(coords) {
  dom.x.value = coords.x.toFixed(2);
  dom.y.value = coords.y.toFixed(2);
  updateLiveCoords(coords);
}

function upsertPoint(event) {
  event.preventDefault();
  const descricao = dom.descricao.value.trim() || `Ponto ${nextId()}`;
  const isUpdate = state.selectedPointId != null;
  const allPts = allTypePoints();

  /* Validar unicidade de descrição no tipo */
  if (!isUpdate) {
    const duplicate = allPts.find(
      (p) => p.descricao.toLowerCase() === descricao.toLowerCase(),
    );
    if (duplicate) {
      const imgLabel = currentImages()[duplicate.imageIndex]?.label || "?";
      alert(`"${descricao}" já existe na imagem "${imgLabel}" (ponto #${duplicate.id}).\nCada item só pode aparecer em uma imagem.`);
      return;
    }
  }

  const point = {
    id: state.selectedPointId || nextId(),
    descricao,
    x: Number(clamp(dom.x.value).toFixed(2)),
    y: Number(clamp(dom.y.value).toFixed(2)),
    status: dom.status.value,
    imageIndex: state.activeImageIndex,
  };

  const index = allPts.findIndex((item) => item.id === point.id);
  if (index >= 0) {
    allPts[index] = { ...allPts[index], ...point };
  } else {
    allPts.push(point);
  }
  state.selectedPointId = point.id;
  saveState();
  render();
}

function removePoint(id) {
  const typeId = state.selectedTypeId;
  state.pointsByType[typeId] = allTypePoints().filter((p) => p.id !== Number(id));
  if (state.selectedPointId === Number(id)) {
    state.selectedPointId = null;
    dom.form.reset();
  }
  saveState();
  render();
}

function resetCurrentPoints() {
  const typeId = state.selectedTypeId;
  state.pointsByType[typeId] = cloneDefaultPoints();
  state.selectedPointId = null;
  dom.form.reset();
  saveState();
  render();
}

/* ── Eventos ── */

function bindEvents() {
  /* Seleção de tipo de veículo */
  dom.typeSelect.addEventListener("change", () => {
    state.selectedTypeId = dom.typeSelect.value;
    state.activeImageIndex = 0;
    state.selectedPointId = null;
    lastMapStructureKey = "";
    dom.form.reset();
    render();
  });

  /* Modo de visualização */
  dom.modeSingle.addEventListener("click", () => {
    if (state.viewMode === "single") return;
    state.viewMode = "single";
    lastMapStructureKey = "";
    render();
  });

  dom.modeDual.addEventListener("click", () => {
    if (state.viewMode === "dual") return;
    state.viewMode = "dual";
    lastMapStructureKey = "";
    render();
  });

  /* Abas de imagem (modo single) */
  dom.imageTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    const idx = Number(btn.dataset.tab);
    if (idx === state.activeImageIndex) return;
    state.activeImageIndex = idx;
    state.selectedPointId = null;
    lastMapStructureKey = "";
    dom.form.reset();
    render();
  });

  /* Botões da barra superior */
  dom.resetPoints.addEventListener("click", resetCurrentPoints);
  dom.clearSelection.addEventListener("click", clearSelection);
  dom.form.addEventListener("submit", upsertPoint);

  /* ── Eventos do mapa (delegação) ── */

  /* Aspecto da imagem via load */
  dom.mapsContainer.addEventListener(
    "load",
    (e) => {
      if (e.target.tagName !== "IMG") return;
      const mapEl = e.target.closest(".map");
      if (!mapEl) return;
      const { naturalWidth, naturalHeight } = e.target;
      if (naturalWidth && naturalHeight) {
        mapEl.style.setProperty("--map-aspect", `${naturalWidth} / ${naturalHeight}`);
      }
    },
    true,
  );

  /* Tooltip de coordenadas */
  dom.mapsContainer.addEventListener("mousemove", (e) => {
    const mapEl = e.target.closest(".map");
    if (!mapEl) return;

    /* Esconder tooltips de outros mapas */
    dom.mapsContainer.querySelectorAll(".cursor-tooltip").forEach((t) => {
      if (t.closest(".map") !== mapEl) t.hidden = true;
    });

    const coords = coordsFromEvent(e, mapEl);
    updateLiveCoords(coords);

    const tooltip = mapEl.querySelector(".cursor-tooltip");
    if (tooltip) {
      tooltip.hidden = false;
      const rect = mapEl.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left}px`;
      tooltip.style.top = `${e.clientY - rect.top}px`;
      tooltip.textContent = `X ${formatPercent(coords.x)} / Y ${formatPercent(coords.y)}`;
    }
  });

  dom.mapsContainer.addEventListener("mouseleave", () => {
    dom.mapsContainer.querySelectorAll(".cursor-tooltip").forEach((t) => (t.hidden = true));
  });

  /* Click no mapa – selecionar ponto ou preencher coordenadas */
  dom.mapsContainer.addEventListener("click", (e) => {
    const frame = e.target.closest(".map-frame");
    if (!frame) return;

    const idx = Number(frame.dataset.frame);
    const marker = e.target.closest(".marker");

    /* Click em marker – seleciona (e troca frame se necessário) */
    if (marker) {
      if (idx !== state.activeImageIndex) {
        state.activeImageIndex = idx;
      }
      selectPoint(marker.dataset.id);
      return;
    }

    const mapEl = e.target.closest(".map");
    if (!mapEl) return;

    /* Click em frame não-ativo – trocar para ele */
    if (idx !== state.activeImageIndex) {
      state.activeImageIndex = idx;
      state.selectedPointId = null;
      dom.form.reset();
      render();
      return;
    }

    /* Click no mapa ativo – preencher coordenadas */
    fillCoords(coordsFromEvent(e, mapEl));
  });

  /* Tabela de pontos */
  dom.tableBody.addEventListener("click", (e) => {
    const removeButton = e.target.closest("[data-remove]");
    if (removeButton) {
      e.stopPropagation();
      removePoint(removeButton.dataset.remove);
      return;
    }
    const row = e.target.closest("[data-id]");
    if (row) selectPoint(row.dataset.id);
  });
}

/* ── Inicialização ── */
populateTypeSelect();
bindEvents();
render();

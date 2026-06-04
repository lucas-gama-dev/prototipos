/* ═══════════════════════════════════════════════════════════════════
   Mapeamento Cartesiano – Checklist de Viaturas SAMU
   ═══════════════════════════════════════════════════════════════════ */

/* ── Catálogo de Veículos ── */
/* Define os tipos de viaturas SAMU com suas imagens (frente e traseira) */
const vehicleTypes = [
  {
    id: "mercedes-sprinter-usb",
    label: "Mercedes Sprinter USB/USA/USI",
    images: [
      {
        id: "mercedes-sprinter-v2-frente",
        label: "Frente/Lateral",
        src: "./MERCEDES-SPRINTER-USB-USA-USI/V2-MERCEDES-SPRINTER-FRENTE.jpg",
      },
      {
        id: "mercedes-sprinter-v2-traseira",
        label: "Traseira",
        src: "./MERCEDES-SPRINTER-USB-USA-USI/V2-MERCEDES-SPRINTER-TRASEIRA.jpg",
      },
    ],
  },
  {
    id: "renault-master-usb",
    label: "Renault Master USB/USA/USI",
    images: [
      {
        id: "renault-master-v1-frente",
        label: "Frente/Lateral",
        src: "./RENAULT-MASTER-USB-USA-USI/V1-RENAULT-MASTER-FRENTE.png",
      },
      {
        id: "renault-master-v1-traseira",
        label: "Traseira",
        src: "./RENAULT-MASTER-USB-USA-USI/V1-RENAULT-MASTER-TRASEIRA.png",
      },
    ],
  },
  {
    id: "toyota-sw4",
    label: "Toyota SW4 VIR/VIM",
    images: [
      {
        id: "toyota-sw4-v3-frente",
        label: "Frente",
        src: "./TOYOTA-SW4-VIR-VIM/V3-TOYOTA-SW4-FRENTE.png",
      },
      {
        id: "toyota-sw4-v3-traseira",
        label: "Traseira",
        src: "./TOYOTA-SW4-VIR-VIM/V3-TOYOTA-SW4-TRASEIRA.png",
      },
    ],
  },
  {
    id: "yamaha-versys",
    label: "Yamaha Versys Motolância",
    images: [
      {
        id: "yamaha-versys-v1-frente",
        label: "Frente",
        src: "./YAMAHA-VERSYS-MOTOLANCIA/V1-YAMAHA-VERSYS-FRENTE.png",
      },
      {
        id: "yamaha-versys-v1-traseira",
        label: "Traseira",
        src: "./YAMAHA-VERSYS-MOTOLANCIA/V1-YAMAHA-VERSYS-TRASEIRA.png",
      },
    ],
  },
];

/* Checklist padrão de 34 pontos de inspeção nas viaturas */
/* Cobre todas as áreas: dianteira, lateral, traseira e componentes específicos */
const defaultChecklist = [
  { id: 1, descricao: "Asa Dianteira" },
  { id: 2, descricao: "Parabrisa" },
  { id: 3, descricao: "Cap\u00f4" },
  { id: 4, descricao: "Farol Dianteiro Direito" },
  { id: 5, descricao: "Grade Frontal" },
  { id: 6, descricao: "Farol Dianteiro Esquerdo" },
  { id: 7, descricao: "Parachoque" },
  { id: 8, descricao: "Lataria Dianteira" },
  { id: 9, descricao: "Exaustor" },
  { id: 10, descricao: "Vigia Lateral Dianteira Esquerda" },
  { id: 11, descricao: "Vigia Lateral Meio Esquerda" },
  { id: 12, descricao: "Vigia Lateral Traseira Esquerda" },
  { id: 13, descricao: "Retrovisor Esquerdo" },
  { id: 14, descricao: "Porta Dianteira Esquerda" },
  { id: 15, descricao: "Lataria Lateral Esquerda" },
  { id: 16, descricao: "Caixa de Ar Esquerda" },
  { id: 17, descricao: "Luz Patrulheiro" },
  { id: 18, descricao: "Luz Embarque" },
  { id: 19, descricao: "Camera" },
  { id: 20, descricao: "Porta Traseira Esquerda" },
  { id: 21, descricao: "Porta Traseira Direita" },
  { id: 22, descricao: "Farol Traseiro Esquerdo" },
  { id: 23, descricao: "Ma\u00e7aneta" },
  { id: 24, descricao: "Estribo Traseiro" },
  { id: 25, descricao: "Farol Traseiro Direito" },
  { id: 26, descricao: "Vigia Traseira Direita" },
  { id: 27, descricao: "Vigia Meio Direita" },
  { id: 28, descricao: "Vigia Dianteira Direita" },
  { id: 29, descricao: "Lataria/Trilho" },
  { id: 30, descricao: "Caixa de Ar Direita" },
  { id: 31, descricao: "Porta Lateral" },
  { id: 32, descricao: "Estribo Lateral" },
  { id: 33, descricao: "Retrovisor Direito" },
  { id: 34, descricao: "Porta Dianteira Direita" },
];

/* Chave para persistência de dados no localStorage */
const storageKey = "samu-cartesian-checklist-v5";

/* ── DOM ── */
/* Referências aos elementos HTML para evitar múltiplas queries */
const dom = {
  typeSelect: document.querySelector("#typeSelect"),
  mapsContainer: document.querySelector("#mapsContainer"),
  imageTabs: document.querySelector("#imageTabs"),
  modeSingle: document.querySelector("#modeSingle"),
  modeDual: document.querySelector("#modeDual"),
  liveCoords: document.querySelector("#liveCoords"),
  resetPoints: document.querySelector("#resetPoints"),
  clearSelection: document.querySelector("#clearSelection"),
  count: document.querySelector("#count"),
  tableBody: document.querySelector("#tableBody"),
  jsonOutput: document.querySelector("#jsonOutput"),
};

/* ── Estado ── */
/* Gerencia o estado global da aplicação (veículo, imagem, seleção, etc.) */
const state = {
  selectedTypeId: vehicleTypes[0].id,
  activeImageIndex: 0,
  viewMode: "single",
  selectedPointId: null,
  pointsByType: loadState(),
};

/* Recupera o estado salvo do localStorage, retorna objeto vazio se inválido */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

/* Persiste o estado dos pontos no localStorage */
function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state.pointsByType));
}

/* ── Helpers ── */
/* Obtém o tipo de veículo atualmente selecionado */
function currentType() {
  return (
    vehicleTypes.find((t) => t.id === state.selectedTypeId) || vehicleTypes[0]
  );
}

/* Retorna as imagens (frente/traseira) do veículo selecionado */
function currentImages() {
  return currentType().images;
}

/* Retorna a imagem atualmente exibida ou a primeira disponível */
function activeImage() {
  return currentImages()[state.activeImageIndex] || currentImages()[0];
}

/* Retorna o ID da imagem ativa */
function activeImageId() {
  return activeImage().id;
}

/* Cria uma cópia profunda do checklist padrão para o tipo de veículo selecionado */
function cloneDefaultPoints() {
  return defaultChecklist.map((p) => ({
    ...p,
    extras: p.extras ? p.extras.map((e) => ({ ...e })) : undefined,
  }));
}

/* Retorna todos os pontos do tipo de veículo atual, inicializando se necessário */
function allTypePoints() {
  const typeId = state.selectedTypeId;
  if (!state.pointsByType[typeId]) {
    state.pointsByType[typeId] = cloneDefaultPoints();
  }
  return state.pointsByType[typeId];
}

/* Verifica se um ponto tem coordenadas válidas (x, y e imagem associada) */
function hasPointPosition(point) {
  return (
    point.imageIndex != null &&
    Number.isFinite(Number(point.x)) &&
    Number.isFinite(Number(point.y))
  );
}

/* Retorna apenas os pontos posicionados em uma imagem específica */
function imagePoints(imageIndex) {
  return allTypePoints().filter(
    (p) => p.imageIndex === imageIndex && hasPointPosition(p),
  );
}

/* Limita um valor entre 0 e 100 (percentual) */
function clamp(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

/* Formata um número como percentual, removendo decimais desnecessários */
function formatPercent(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

/* ── Rendering ── */
/* Popula o select de tipos de veículos com as opções disponíveis */
function populateTypeSelect() {
  dom.typeSelect.innerHTML = vehicleTypes
    .map((t) => `<option value="${t.id}">${t.label}</option>`)
    .join("");
  dom.typeSelect.value = state.selectedTypeId;
}

/* Renderiza as abas de imagem (frente/traseira); oculta em modo dual */
function renderImageTabs() {
  const images = currentImages();
  dom.imageTabs.innerHTML = images
    .map((img, i) => {
      const active = i === state.activeImageIndex ? " is-active" : "";
      return `<button class="tab-btn${active}" type="button" data-tab="${i}">${img.label}</button>`;
    })
    .join("");
}

/* Atualiza a visualização dos botões de modo (single/dual) */
function renderViewMode() {
  dom.modeSingle.classList.toggle("is-active", state.viewMode === "single");
  dom.modeDual.classList.toggle("is-active", state.viewMode === "dual");
}

/* Gera HTML para um marcador (ponto) no mapa, posicionado com coordenadas percentuais */
function markerHTML(point, coords, isExtra = false) {
  const selected =
    point.id === state.selectedPointId && !isExtra ? " is-selected" : "";
  const extraClass = isExtra ? " is-extra" : "";
  const label = point.descricao;
  return `
    <button
      class="marker${selected}${extraClass}"
      style="--x:${coords.x};--y:${coords.y}"
      type="button"
      data-id="${point.id}"
      data-label="${label}"
      aria-label="Ponto ${point.id}: ${label}"
    >${point.id}</button>
  `;
}

/* Gera HTML para todos os marcadores de uma imagem (principal + extras) */
function markersHTML(imgIndex) {
  return imagePoints(imgIndex)
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

/* Gera HTML para um frame do mapa com imagem, grid, rótulos e marcadores */
function mapFrameHTML(image, index) {
  const isActive = index === state.activeImageIndex;
  return `
    <div class="map-frame${isActive ? " is-active" : ""}" data-frame="${index}">
      <div class="map-frame-label">${image.label}</div>
      <div class="map-wrap">
        <div class="map" data-map="${index}" aria-label="Mapa cartesiano – ${image.label}">
          <div class="axis-label axis-origin">(0,0)</div>
          <div class="axis-label axis-x">X → (100,0)</div>
          <div class="axis-label axis-y">Y ↓ (0,100)</div>
          <div class="axis-label axis-end">(100,100)</div>
          <div class="tick tick-x tick-x-25">25</div>
          <div class="tick tick-x tick-x-50">50</div>
          <div class="tick tick-x tick-x-75">75</div>
          <div class="tick tick-y tick-y-25">25</div>
          <div class="tick tick-y tick-y-50">50</div>
          <div class="tick tick-y tick-y-75">75</div>
          <img src="${image.src}" alt="Viatura SAMU – ${image.label}" />
          <div class="markers">${markersHTML(index)}</div>
          <div class="cursor-tooltip" hidden></div>
        </div>
      </div>
    </div>
  `;
}

/* Chave que identifica quando a estrutura do mapa precisa ser recriada */
let lastMapStructureKey = "";

/* Gera chave única baseada em veículo, modo e imagem ativa */
function getMapStructureKey() {
  return `${state.selectedTypeId}|${state.viewMode}|${state.viewMode === "single" ? state.activeImageIndex : "all"}`;
}

/* Renderiza os mapas: recria estrutura se mudou veículo/modo, senão atualiza marcadores */
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
      dom.mapsContainer.innerHTML = mapFrameHTML(
        activeImage(),
        state.activeImageIndex,
      );
    }
  } else {
    updateMarkersInPlace();
  }
}

/* Atualiza apenas os marcadores dos mapas sem recriar a estrutura HTML (performance) */
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

/* Renderiza tabela de pontos com coordenadas e ações (adicionar/limpar) */
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
      const action = positioned
        ? `<button class="table-action is-clear" type="button" data-clear-position="${point.id}" aria-label="Limpar posição do ponto ${point.id}" title="Limpar posição">x</button>`
        : `<button class="table-action is-add" type="button" data-place="${point.id}" aria-label="Posicionar ponto ${point.id}" title="Posicionar">+</button>`;
      return `
        <tr${selected} data-id="${point.id}">
          <td><strong>${point.id}</strong></td>
          <td>${point.descricao}</td>
          <td class="${positioned ? "" : "coord-empty"}">${x}</td>
          <td class="${positioned ? "" : "coord-empty"}">${y}</td>
          <td>${action}</td>
        </tr>
      `;
    })
    .join("");
}

/* Gera e exibe JSON com estrutura completa: tipo, imagens e pontos posicionados */
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
        extras: point.extras,
      })),
    })),
  };
  dom.jsonOutput.textContent = JSON.stringify(payload, null, 2);
}

/* Exibe o contador de pontos posicionados vs total */
function renderCount() {
  const points = allTypePoints();
  const positioned = points.filter(hasPointPosition).length;
  dom.count.textContent = `${positioned}/${points.length}`;
}

/* Renderiza toda a interface (orquestrador principal) */
function render() {
  renderImageTabs();
  renderViewMode();
  renderMaps();
  renderTable();
  renderJson();
  renderCount();
}

/* ── Ações ── */
/* Seleciona um ponto e muda para sua imagem se necessário */
function selectPoint(id) {
  state.selectedPointId = Number(id);
  const selected = allTypePoints().find((p) => p.id === state.selectedPointId);
  if (
    selected &&
    hasPointPosition(selected) &&
    selected.imageIndex !== state.activeImageIndex
  ) {
    state.activeImageIndex = selected.imageIndex;
    lastMapStructureKey = "";
  }
  render();
}

/* Limpa a seleção atual de ponto */
function clearSelection() {
  state.selectedPointId = null;
  render();
}

/* Atualiza a exibição de coordenadas em tempo real (seguindo o mouse) */
function updateLiveCoords(coords) {
  dom.liveCoords.textContent = `X ${formatPercent(coords.x)} / Y ${formatPercent(coords.y)}`;
}

/* Converte coordenadas do evento do mouse em percentual (0-100) relativo ao mapa */
function coordsFromEvent(event, mapEl) {
  const rect = mapEl.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100),
  };
}

/* Posiciona o ponto selecionado nas coordenadas fornecidas e salva */
function positionSelectedPoint(coords) {
  const selected = allTypePoints().find((p) => p.id === state.selectedPointId);
  if (!selected) return false;

  selected.x = Number(coords.x.toFixed(2));
  selected.y = Number(coords.y.toFixed(2));
  selected.imageIndex = state.activeImageIndex;
  saveState();
  render();
  return true;
}

/* Remove coordenadas e associação de imagem de um ponto */
function clearPointPosition(id) {
  const point = allTypePoints().find((p) => p.id === Number(id));
  if (!point) return;
  delete point.x;
  delete point.y;
  delete point.imageIndex;
  delete point.extras;
  if (state.selectedPointId === Number(id)) {
    state.selectedPointId = null;
  }
  saveState();
  render();
}

/* Reseta todos os pontos do veículo atual para o estado padrão */
function resetCurrentPoints() {
  const typeId = state.selectedTypeId;
  state.pointsByType[typeId] = cloneDefaultPoints();
  state.selectedPointId = null;
  saveState();
  render();
}

/* ── Eventos ── */
/* Liga todos os listeners de eventos da aplicação */
function bindEvents() {
  /* Seleção de tipo de veículo – muda de veículo e reseta visualização */
  dom.typeSelect.addEventListener("change", () => {
    state.selectedTypeId = dom.typeSelect.value;
    state.activeImageIndex = 0;
    state.selectedPointId = null;
    lastMapStructureKey = "";
    render();
  });

  /* Modo de visualização – alterna entre single e dual */
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

  /* Abas de imagem (modo single) – muda imagem ativa e limpa seleção */
  dom.imageTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    const idx = Number(btn.dataset.tab);
    if (idx === state.activeImageIndex) return;
    state.activeImageIndex = idx;
    state.selectedPointId = null;
    lastMapStructureKey = "";
    render();
  });

  /* Botões da barra superior – reset e limpar seleção */
  dom.resetPoints.addEventListener("click", resetCurrentPoints);
  dom.clearSelection.addEventListener("click", clearSelection);

  /* ── Eventos do mapa (delegação) ── */

  /* Aspecto da imagem via load – ajusta proporção da imagem quando carregada */
  dom.mapsContainer.addEventListener(
    "load",
    (e) => {
      if (e.target.tagName !== "IMG") return;
      const mapEl = e.target.closest(".map");
      if (!mapEl) return;
      const { naturalWidth, naturalHeight } = e.target;
      if (naturalWidth && naturalHeight) {
        mapEl.style.setProperty(
          "--map-aspect",
          `${naturalWidth} / ${naturalHeight}`,
        );
      }
    },
    true,
  );

  /* Tooltip de coordenadas – segue cursor e mostra coordenadas em tempo real */
  dom.mapsContainer.addEventListener("mousemove", (e) => {
    const mapEl = e.target.closest(".map");
    if (!mapEl) return;

    /* Esconder tooltips de outros mapas para modo dual */
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
    dom.mapsContainer
      .querySelectorAll(".cursor-tooltip")
      .forEach((t) => (t.hidden = true));
  });

  /* Click no mapa – selecionar marcador ou preencher coordenadas do ponto selecionado */
  dom.mapsContainer.addEventListener("click", (e) => {
    const frame = e.target.closest(".map-frame");
    if (!frame) return;

    const idx = Number(frame.dataset.frame);
    const marker = e.target.closest(".marker");

    /* Click em marcador – seleciona ponto (troca frame se necessário) */
    if (marker) {
      if (idx !== state.activeImageIndex) {
        state.activeImageIndex = idx;
      }
      selectPoint(marker.dataset.id);
      return;
    }

    const mapEl = e.target.closest(".map");
    if (!mapEl) return;

    /* Click em frame não-ativo – muda frame e posiciona ponto se havia selecionado */
    if (idx !== state.activeImageIndex) {
      state.activeImageIndex = idx;
      const coords = coordsFromEvent(e, mapEl);
      if (positionSelectedPoint(coords)) {
        return;
      }
      state.selectedPointId = null;
      render();
      return;
    }

    /* Click no mapa ativo – posiciona ponto selecionado ou exibe coordenadas */
    const coords = coordsFromEvent(e, mapEl);
    if (!positionSelectedPoint(coords)) {
      updateLiveCoords(coords);
    }
  });

  /* Tabela de pontos – ações de limpar/posicionar ou selecionar linha */
  dom.tableBody.addEventListener("click", (e) => {
    const clearButton = e.target.closest("[data-clear-position]");
    if (clearButton) {
      e.stopPropagation();
      clearPointPosition(clearButton.dataset.clearPosition);
      return;
    }
    const placeButton = e.target.closest("[data-place]");
    if (placeButton) {
      e.stopPropagation();
      selectPoint(placeButton.dataset.place);
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

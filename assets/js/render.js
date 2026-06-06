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
import { formatPercent } from "./utils.js";

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

function renderCount() {
  const points = allTypePoints();
  const positioned = points.filter(hasPointPosition).length;
  dom.count.textContent = `${positioned}/${points.length}`;
}

export function render() {
  renderImageTabs();
  renderViewMode();
  renderMaps();
  renderTable();
  renderJson();
  renderCount();
}

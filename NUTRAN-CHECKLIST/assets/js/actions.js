import { dom } from "./dom.js";
import { render, resetMapStructure } from "./render.js";
import { savePoints } from "./storage.js";
import { allTypePoints, hasPointPosition, state } from "./state.js";
import { clamp, formatPercent } from "./utils.js";

export function selectPoint(id) {
  state.selectedPointId = Number(id);

  const selected = allTypePoints().find(
    (point) => point.id === state.selectedPointId,
  );

  if (
    selected &&
    hasPointPosition(selected) &&
    selected.imageIndex !== state.activeImageIndex
  ) {
    state.activeImageIndex = selected.imageIndex;
    resetMapStructure();
  }

  render();
  scrollSelectedRowIntoView();
}

export function scrollSelectedRowIntoView() {
  if (!state.selectedPointId) return;

  const row = dom.tableBody.querySelector(
    `tr[data-id="${state.selectedPointId}"]`,
  );
  const scroller = dom.tableBody.closest(".table-wrap");

  if (!row || !scroller) return;

  // Altura do cabecalho fixo (sticky): a area visivel do corpo comeca abaixo dele.
  const thead = scroller.querySelector("thead");
  const headerHeight = thead ? thead.offsetHeight : 0;

  const scrollerTop = scroller.getBoundingClientRect().top;
  const rowTop = row.getBoundingClientRect().top - scrollerTop;
  const rowBottom = rowTop + row.offsetHeight;

  if (rowTop < headerHeight) {
    scroller.scrollTop -= headerHeight - rowTop;
  } else if (rowBottom > scroller.clientHeight) {
    scroller.scrollTop += rowBottom - scroller.clientHeight;
  }
}

export function updateLiveCoords(coords) {
  dom.liveCoords.textContent = `X ${formatPercent(coords.x)} / Y ${formatPercent(coords.y)}`;
}

export function coordsFromEvent(event, mapEl) {
  const rect = mapEl.getBoundingClientRect();

  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100),
  };
}

export function positionSelectedPoint(coords) {
  const selected = allTypePoints().find(
    (point) => point.id === state.selectedPointId,
  );

  if (!selected) return false;

  selected.x = Number(coords.x.toFixed(2));
  selected.y = Number(coords.y.toFixed(2));
  selected.imageIndex = state.activeImageIndex;

  savePoints(state.pointsByType);
  render();
  scrollSelectedRowIntoView();

  return true;
}

export function clearPointPosition(id) {
  const point = allTypePoints().find((item) => item.id === Number(id));
  if (!point) return;

  delete point.x;
  delete point.y;
  delete point.imageIndex;
  delete point.extras;

  if (state.selectedPointId === Number(id)) {
    state.selectedPointId = null;
  }

  savePoints(state.pointsByType);
  render();
}

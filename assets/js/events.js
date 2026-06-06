import {
  clearPointPosition,
  coordsFromEvent,
  positionSelectedPoint,
  selectPoint,
  updateLiveCoords,
} from "./actions.js";
import { dom } from "./dom.js";
import { render, renderJson, resetMapStructure } from "./render.js";
import { state } from "./state.js";
import { formatPercent } from "./utils.js";

export function bindEvents() {
  dom.typeSelect.addEventListener("change", () => {
    state.selectedTypeId = dom.typeSelect.value;
    state.activeImageIndex = 0;
    state.selectedPointId = null;
    resetMapStructure();
    render();
  });

  dom.modeSingle.addEventListener("click", () => {
    if (state.viewMode === "single") return;

    state.viewMode = "single";
    resetMapStructure();
    render();
  });

  dom.modeDual.addEventListener("click", () => {
    if (state.viewMode === "dual") return;

    state.viewMode = "dual";
    resetMapStructure();
    render();
  });

  dom.imageTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;

    const index = Number(button.dataset.tab);
    if (index === state.activeImageIndex) return;

    state.activeImageIndex = index;
    state.selectedPointId = null;
    resetMapStructure();
    render();
  });

  dom.mapsContainer.addEventListener("mousemove", (event) => {
    const mapEl = event.target.closest(".map");
    if (!mapEl) return;

    dom.mapsContainer.querySelectorAll(".cursor-tooltip").forEach((tooltip) => {
      if (tooltip.closest(".map") !== mapEl) tooltip.hidden = true;
    });

    const coords = coordsFromEvent(event, mapEl);
    updateLiveCoords(coords);

    const tooltip = mapEl.querySelector(".cursor-tooltip");
    if (!tooltip) return;

    const rect = mapEl.getBoundingClientRect();
    tooltip.hidden = false;
    tooltip.style.left = `${event.clientX - rect.left}px`;
    tooltip.style.top = `${event.clientY - rect.top}px`;
    tooltip.textContent = `X ${formatPercent(coords.x)} / Y ${formatPercent(coords.y)}`;
  });

  dom.mapsContainer.addEventListener("mouseleave", () => {
    dom.mapsContainer
      .querySelectorAll(".cursor-tooltip")
      .forEach((tooltip) => {
        tooltip.hidden = true;
      });
  });

  dom.mapsContainer.addEventListener("click", (event) => {
    const frame = event.target.closest(".map-frame");
    if (!frame) return;

    const index = Number(frame.dataset.frame);
    const marker = event.target.closest(".marker");

    if (marker) {
      if (index !== state.activeImageIndex) {
        state.activeImageIndex = index;
      }

      selectPoint(marker.dataset.id);
      return;
    }

    const mapEl = event.target.closest(".map");
    if (!mapEl) return;

    if (index !== state.activeImageIndex) {
      state.activeImageIndex = index;

      if (positionSelectedPoint(coordsFromEvent(event, mapEl))) {
        return;
      }

      state.selectedPointId = null;
      render();
      return;
    }

    const coords = coordsFromEvent(event, mapEl);

    if (!positionSelectedPoint(coords)) {
      updateLiveCoords(coords);
    }
  });

  dom.tableBody.addEventListener("click", (event) => {
    const clearButton = event.target.closest("[data-clear-position]");

    if (clearButton) {
      event.stopPropagation();
      clearPointPosition(clearButton.dataset.clearPosition);
      return;
    }

    const placeButton = event.target.closest("[data-place]");

    if (placeButton) {
      event.stopPropagation();
      selectPoint(placeButton.dataset.place);
      return;
    }

    const row = event.target.closest("[data-id]");
    if (row) selectPoint(row.dataset.id);
  });

  dom.btnOpenJson.addEventListener("click", () => {
    renderJson();
    dom.jsonModal.hidden = false;
  });

  dom.btnCloseJson.addEventListener("click", () => {
    dom.jsonModal.hidden = true;
  });

  dom.jsonModal.addEventListener("click", (event) => {
    if (event.target === dom.jsonModal) {
      dom.jsonModal.hidden = true;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.jsonModal.hidden) {
      dom.jsonModal.hidden = true;
    }
  });

  dom.btnCopyJson.addEventListener("click", () => {
    navigator.clipboard.writeText(dom.jsonOutput.textContent).then(() => {
      const button = dom.btnCopyJson;
      button.classList.add("is-copied");
      button.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';

      setTimeout(() => {
        button.classList.remove("is-copied");
        button.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
      }, 2000);
    });
  });
}

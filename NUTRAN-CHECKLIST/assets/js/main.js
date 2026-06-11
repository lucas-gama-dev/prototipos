import { initCrud } from "./crud.js";
import { dom } from "./dom.js";
import { bindEvents } from "./events.js";
import { resolveVehicleImages } from "./images.js";
import { populateTypeSelect, render } from "./render.js";
import { setVehicleTypes } from "./state.js";

async function init() {
  // CRUD e independente do mapeamento — inicializa sempre (mesmo sem imagens).
  initCrud();

  dom.mapsContainer.innerHTML =
    '<div class="app-message"><i class="fa-solid fa-spinner fa-spin"></i> Detectando vers&otilde;es de imagens...</div>';

  const vehicleTypes = await resolveVehicleImages();
  setVehicleTypes(vehicleTypes);

  if (vehicleTypes.length === 0) {
    dom.mapsContainer.innerHTML =
      '<div class="app-message is-error">Nenhuma imagem encontrada nas pastas.</div>';
    return;
  }

  populateTypeSelect();
  bindEvents();
  render();
}

init();

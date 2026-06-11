import { getChecklistForMarca } from "./crud.js";
import { vehicleTypesConfig } from "./data/vehicles.js";
import { loadPoints } from "./storage.js";

let vehicleTypes = [];

export const state = {
  selectedTypeId: null,
  activeImageIndex: 0,
  viewMode: "single",
  selectedPointId: null,
  pointsByType: loadPoints(),
};

export function setVehicleTypes(types) {
  vehicleTypes = Array.isArray(types) ? types : [];

  if (!state.selectedTypeId && vehicleTypes.length > 0) {
    state.selectedTypeId = vehicleTypes[0].id;
  }
}

export function getVehicleTypes() {
  return vehicleTypes;
}

export function currentType() {
  return (
    vehicleTypes.find((type) => type.id === state.selectedTypeId) ||
    vehicleTypes[0]
  );
}

export function currentImages() {
  const type = currentType();
  return type ? type.images : [];
}

export function activeImage() {
  const images = currentImages();
  return images[state.activeImageIndex] || images[0];
}

// Retorna os itens do CRUD aplicaveis ao veiculo selecionado, na ordem do CRUD.
function getPointsForType(typeId) {
  const config = vehicleTypesConfig.find((c) => c.id === typeId);
  const marcaId = config ? config.crudMarcaId : null;
  const items = getChecklistForMarca(marcaId);
  return items.map((item) => ({ ...item }));
}

export function allTypePoints() {
  const typeId = state.selectedTypeId;

  if (!typeId) return [];

  if (!state.pointsByType[typeId]) {
    state.pointsByType[typeId] = getPointsForType(typeId);
  }

  return state.pointsByType[typeId];
}

export function hasPointPosition(point) {
  return (
    point.imageIndex != null &&
    Number.isFinite(Number(point.x)) &&
    Number.isFinite(Number(point.y))
  );
}

export function imagePoints(imageIndex) {
  return allTypePoints().filter(
    (point) => point.imageIndex === imageIndex && hasPointPosition(point),
  );
}

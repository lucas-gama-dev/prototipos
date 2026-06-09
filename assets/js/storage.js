const storageKey = "samu-cartesian-checklist-v8";

export function loadPoints() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

export function savePoints(pointsByType) {
  localStorage.setItem(storageKey, JSON.stringify(pointsByType));
}

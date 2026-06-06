export function clamp(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function formatPercent(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

import { VERSION_MAX, vehicleTypesConfig } from "./data/vehicles.js";

const FETCH_TIMEOUT_MS = 2000;

async function fetchHead(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    return response.ok ? url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function findLatestVersion(folder, viewFolder, viewName, prefix, extensions) {
  for (let version = VERSION_MAX; version >= 1; version--) {
    // Testa todas as extensoes em paralelo para cada versao.
    const urls = extensions.map(
      (ext) => `./${folder}/${viewFolder}/V${version}-${prefix}-${viewName}.${ext}`,
    );
    const results = await Promise.all(urls.map(fetchHead));
    const found = results.find((r) => r !== null);
    if (found) {
      const ext = found.split(".").pop();
      return { version, src: found, ext };
    }
  }
  return null;
}

export async function resolveVehicleImages() {
  const resolved = await Promise.all(
    vehicleTypesConfig.map(async (config) => {
      const [frente, traseira] = await Promise.all([
        findLatestVersion(
          config.folder,
          "1-FRENTE",
          "FRENTE",
          config.prefix,
          config.extensions,
        ),
        findLatestVersion(
          config.folder,
          "2-TRASEIRA",
          "TRASEIRA",
          config.prefix,
          config.extensions,
        ),
      ]);

      const images = [];

      if (frente) {
        images.push({
          id: `${config.id}-v${frente.version}-frente`,
          label: "Frente",
          src: frente.src,
        });
      }

      if (traseira) {
        images.push({
          id: `${config.id}-v${traseira.version}-traseira`,
          label: "Traseira",
          src: traseira.src,
        });
      }

      return {
        id: config.id,
        label: config.label,
        images,
      };
    }),
  );

  return resolved.filter((type) => type.images.length > 0);
}

import { VERSION_MAX, vehicleTypesConfig } from "./data/vehicles.js";
async function findLatestVersion(folder, viewFolder, viewName, prefix, extensions) {
  for (let version = VERSION_MAX; version >= 1; version--) {
    for (const ext of extensions) {
      const url = `./${folder}/${viewFolder}/V${version}-${prefix}-${viewName}.${ext}`;

      try {
        const response = await fetch(url, { method: "HEAD" });
        if (response.ok) return { version, src: url, ext };
      } catch {
        // Mantem a busca tolerante a falhas pontuais de rede/servidor.
      }
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

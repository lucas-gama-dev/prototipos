export function parseCSV(text) {
  const lines = text.trim().split('\n');
  const newData = [];

  // Tenta detectar cabeçalho
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('lat') && firstLine.includes('lng')) {
    startIndex = 1; // Pula cabeçalho
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Suporta separador vírgula ou ponto-e-vírgula
    const parts = line
      .split(/[,;]/)
      .map((p) => p.trim())
      .map((p) => p.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, ''));

    let id, name, latStr, lngStr, speed, time;

    if (parts.length >= 6) {
      [id, name, latStr, lngStr, speed, time] = parts;
    } else if (parts.length >= 2) {
      // Fallback simples
      id = parts[0];
      name = parts[1];
      latStr = parts[2];
      lngStr = parts[3];
      speed = parts[4];
      time = parts[5];
    }

    // Limpeza de coordenadas (remove pontos extras se houver)
    const cleanCoord = (str) => {
      if (!str) return 0;
      let parts = str.split('.');
      if (parts.length > 2) {
        return parseFloat(parts[0] + '.' + parts.slice(1).join(''));
      }
      return parseFloat(str);
    };

    const lat = cleanCoord(latStr);
    const lng = cleanCoord(lngStr);

    if (!isNaN(lat) && !isNaN(lng)) {
      newData.push({
        id: id || '',
        name: name || '',
        lat: lat,
        lng: lng,
        speed: speed || '',
        time: time || '',
      });
    }
  }
  return newData;
}

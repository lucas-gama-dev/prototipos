import { MapManager } from './map.js';
import { parseCSV } from './parser.js';
import { parseTimeStr, readFileAsText } from './utils.js';
import { updateStatsUI } from './ui.js';

const mapManager = new MapManager('map');
let rawData = [];
const defaultJsonFile = 'data/rota-default.json';
let playbackData = [];
let playbackIndex = 0;
let playbackTimer = null;
let playbackSpeed = 1;
let isPlaying = false;
let playbackDistances = [];
let playbackBaseMode = 'selected'; // Padrão: tempo do ponto selecionado
let playbackBaseIndex = 0;
let playbackSelectedIndex = null;
let playbackBaseStatus = null; // Status da equipe usado como ponto base
let playbackAnimationFrame = null;
let smoothPathCache = null;

// Status da equipe com horários (ordem cronológica)
const teamStatusList = [
  { datetime: '03/02/2026 00:26:11', status: 'Aguardando Deslocamento' },
  { datetime: '03/02/2026 00:26:29', status: 'Equipe comunicada' },
  { datetime: '03/02/2026 00:27:00', status: 'Partindo para o atendimento' },
  { datetime: '03/02/2026 01:39:43', status: 'APH Cancelado' },
  { datetime: '03/02/2026 01:41:43', status: 'Disponível' },
];

/**
 * Retorna o status da equipe para um dado horário
 * O status vigente é o último cujo horário <= horário do ponto
 */
function getTeamStatusForTime(pointTime) {
  if (!pointTime) return null;
  
  const pointDate = parseTimeStr(pointTime);
  if (!pointDate) return null;
  
  let currentStatus = null;
  
  for (const item of teamStatusList) {
    const statusDate = parseTimeStr(item.datetime);
    if (!statusDate) continue;
    
    if (statusDate.getTime() <= pointDate.getTime()) {
      currentStatus = item.status;
    } else {
      break; // Lista está ordenada, então podemos parar
    }
  }
  
  return currentStatus;
}

// ========================================
// CATMULL-ROM SPLINE INTERPOLATION
// ========================================

/**
 * Gera um ponto interpolado usando Catmull-Rom spline
 * @param {number} t - Parâmetro de interpolação [0, 1]
 * @param {Object} p0 - Ponto de controle anterior
 * @param {Object} p1 - Ponto inicial do segmento
 * @param {Object} p2 - Ponto final do segmento
 * @param {Object} p3 - Ponto de controle posterior
 * @param {number} tension - Tensão da curva (0.5 = padrão Catmull-Rom)
 * @returns {Object} Ponto interpolado {lat, lng}
 */
function catmullRomInterpolate(t, p0, p1, p2, p3, tension = 0.5) {
  const t2 = t * t;
  const t3 = t2 * t;

  // Coeficientes Catmull-Rom
  const s = tension;
  const m0Lat = s * (p2.lat - p0.lat);
  const m0Lng = s * (p2.lng - p0.lng);
  const m1Lat = s * (p3.lat - p1.lat);
  const m1Lng = s * (p3.lng - p1.lng);

  // Fórmula de Hermite
  const a0 = 2 * t3 - 3 * t2 + 1;
  const a1 = t3 - 2 * t2 + t;
  const a2 = -2 * t3 + 3 * t2;
  const a3 = t3 - t2;

  return {
    lat: a0 * p1.lat + a1 * m0Lat + a2 * p2.lat + a3 * m1Lat,
    lng: a0 * p1.lng + a1 * m0Lng + a2 * p2.lng + a3 * m1Lng,
  };
}

/**
 * Gera um caminho suavizado usando Catmull-Rom spline
 * @param {Array} points - Array de pontos GPS [{lat, lng, ...}, ...]
 * @param {number} segmentsPerPoint - Número de segmentos interpolados entre cada par de pontos
 * @returns {Array} Caminho suavizado com pontos interpolados
 */
function generateSmoothPath(points, segmentsPerPoint = 10) {
  if (!Array.isArray(points) || points.length < 2) return points;

  const smoothPath = [];

  for (let i = 0; i < points.length - 1; i++) {
    // Pontos de controle para Catmull-Rom
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

    // Adiciona o ponto original
    smoothPath.push({
      ...p1,
      originalIndex: i,
      isOriginal: true,
    });

    // Gera pontos interpolados entre p1 e p2
    for (let j = 1; j < segmentsPerPoint; j++) {
      const t = j / segmentsPerPoint;
      const interpolated = catmullRomInterpolate(t, p0, p1, p2, p3);

      // Interpola também o tempo para cálculos de duração
      const progress = t;
      const interpolatedTime = interpolateTimeString(p1.time, p2.time, progress);

      smoothPath.push({
        lat: interpolated.lat,
        lng: interpolated.lng,
        name: p1.name,
        speed: p1.speed,
        time: interpolatedTime,
        originalIndex: i,
        isOriginal: false,
        segmentProgress: t,
      });
    }
  }

  // Adiciona o último ponto original
  const lastPoint = points[points.length - 1];
  smoothPath.push({
    ...lastPoint,
    originalIndex: points.length - 1,
    isOriginal: true,
  });

  return smoothPath;
}

/**
 * Interpola entre duas strings de tempo
 * @param {string} timeStr1 - Tempo inicial
 * @param {string} timeStr2 - Tempo final
 * @param {number} progress - Progresso [0, 1]
 * @returns {string} Tempo interpolado
 */
function interpolateTimeString(timeStr1, timeStr2, progress) {
  const t1 = parseTimeStr(timeStr1);
  const t2 = parseTimeStr(timeStr2);
  if (!t1 || !t2) return timeStr1;

  const interpolatedMs = t1.getTime() + (t2.getTime() - t1.getTime()) * progress;
  const date = new Date(interpolatedMs);

  // Formata como DD/MM/YYYY HH:mm:ss
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Função de easing cúbica suave (ease-in-out)
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Função de easing suave (sine)
 */
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Atualiza a UI do ponto base selecionado
 * @param {number|null} index - Índice do ponto selecionado ou null para limpar
 * @param {string|null} status - Status da equipe (opcional)
 */
function updateSelectedPointUI(index, status = null) {
  const container = document.getElementById('activeBaseInfo');
  const textEl = document.getElementById('baseInfoText');
  const labelEl = document.getElementById('baseInfoLabel');
  
  if (!container || !textEl || !labelEl) return;
  
  // Se não tiver índice válido ou for modo 'start' (index 0 implicito sem status), esconde ou mostra 'Início'
  // Mas a lógica do nosso sistema define: se index é null, não tem base DIFERENTE do início padrão.
  // Se quisermos mostrar "DO INÍCIO", podemos. Mas o padrão visual anterior era esconder.
  // Vamos adaptar: Se for Start, esconde (comportamento padrão). Se tiver algo CUSTOM, mostra.
  
  if (index === null || index === undefined || !playbackData[index]) {
    container.style.display = 'none';
    playbackBaseStatus = null;
    return;
  }

  // Se for o primeiro ponto E não tiver status E o modo for start, esconde (é o padrão)
  if (playbackBaseMode === 'start' && !status) {
    container.style.display = 'none';
    return;
  }
  
  const point = playbackData[index];
  const time = point.time || '-';
  const position = `#${index + 1}`;
  
  if (status) {
    playbackBaseStatus = status;
    labelEl.textContent = `${status}:`; // Ex: "Equipe Comunicada:"
    textEl.textContent = `${position} - ${time}`;
  } else {
    playbackBaseStatus = null;
    labelEl.textContent = 'Ponto Selecionado:';
    textEl.textContent = `${position} - ${time}`;
  }
  
  container.style.display = 'flex';
}

/**
 * Limpa o ponto base selecionado
 */
function clearSelectedPoint() {
  playbackSelectedIndex = null;
  playbackBaseIndex = 0;
  updateSelectedPointUI(null);
}

document.addEventListener('DOMContentLoaded', () => {
  mapManager.init();
  initPlaybackControls();
  
  // Handler para clique em ponto no mapa
  mapManager.setPointClickHandler((point, index) => {
    if (!playbackData || playbackData.length === 0) return;
    
    // Só define ponto base se ainda não tiver um selecionado (playbackSelectedIndex === null)
    // Depois de definido, só pode ser alterado via botão de lixeira
    if (playbackSelectedIndex === null && playbackBaseMode === 'selected') {
      playbackSelectedIndex = index;
      playbackBaseIndex = index;
      updateSelectedPointUI(index);
    }
    
    // Sempre permite navegar para o ponto clicado
    seekPlayback(index);
  });
  
  // Handler para botão de lixeira
  const clearBtn = document.getElementById('clearSelectedPoint');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearSelectedPoint);
  }
  
  // Handler para botão do Google Maps
  const btnGoogleMaps = document.getElementById('btnOpenGoogleMaps');
  if (btnGoogleMaps) {
    btnGoogleMaps.addEventListener('click', openGoogleMaps);
  }
  
  loadDefaultJson();
});

// Upload
document.getElementById('csvFile').addEventListener('change', async function (e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  if (files.length > 5) {
    alert('Por favor, selecione no máximo 5 arquivos.');
    e.target.value = '';
    return;
  }

  files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  let allData = [];

  try {
    for (const file of files) {
      const text = await readFileAsText(file);
      const newData = parseCSV(text);
      if (newData.length > 0) {
        allData = allData.concat(newData);
      }
    }

    if (allData.length > 0) {
      rawData = allData;
      setCurrentRouteLabel('Rota atual: Arquivos CSV importados');
      applyFilterAndUpdateMap();
    } else {
      alert('Não foi possível ler dados válidos dos arquivos CSV. Verifique o formato.');
    }
  } catch (error) {
    console.error('Erro ao ler arquivos:', error);
    alert('Erro ao processar arquivos.');
  }
});

// Filter
document.getElementById('timeFilter').addEventListener('change', applyFilterAndUpdateMap);
document.getElementById('stoppedFilter').addEventListener('change', applyFilterAndUpdateMap);

// Measure
const measureCheckbox = document.getElementById('measureMode');
const measureTip = document.getElementById('measureTip');
const measureTipText = document.getElementById('measureTipText');
const measureHelpBtn = document.getElementById('measureHelp');

measureCheckbox.addEventListener('change', function (e) {
  mapManager.setMeasureMode(e.target.checked);
  
  if (e.target.checked) {
    // Mostra dica ao ativar
    measureTipText.textContent = '1. Clique no ponto inicial da rota. 2. Clique no ponto final. A distância percorrida será calculada.';
    measureTip.style.display = 'flex';
  } else {
    measureTip.style.display = 'none';
  }
});

document.getElementById('clearMeasure').addEventListener('click', () => {
  mapManager.clearMeasurement();
  if (measureCheckbox.checked) {
    measureTipText.textContent = 'Seleção limpa. Clique em 2 pontos para medir novamente.';
    measureTip.style.display = 'flex';
  }
});

measureHelpBtn.addEventListener('click', () => {
  // Toggle dica
  if (measureTip.style.display === 'none' || !measureTip.style.display) {
    measureTipText.textContent = 'Ative "Medir Rota", clique em 2 pontos do trajeto e veja a distância percorrida entre eles.';
    measureTip.style.display = 'flex';
  } else {
    measureTip.style.display = 'none';
  }
});

function normalizeSpeedValue(speed) {
  if (speed === null || speed === undefined) return '';
  return String(speed).toLowerCase();
}

function isStoppedPoint(point) {
  const speed = normalizeSpeedValue(point?.speed);
  if (speed.includes('parado')) return true;
  const match = speed.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return false;
  const numeric = parseFloat(match[0].replace(',', '.'));
  return Number.isFinite(numeric) && numeric === 0;
}

function reduceStoppedPoints(data, reductionPercent) {
  if (!Array.isArray(data) || data.length === 0) return [];
  if (!Number.isFinite(reductionPercent) || reductionPercent <= 0) return data;
  const stoppedIndices = [];
  const distanceThresholdKm = 0.005;
  data.forEach((point, index) => {
    const prevPoint = index > 0 ? data[index - 1] : null;
    const stoppedBySpeed = isStoppedPoint(point);
    const stoppedByDistance =
      prevPoint && calculateDistanceKm(prevPoint, point) <= distanceThresholdKm;
    if (stoppedBySpeed || stoppedByDistance) stoppedIndices.push(index);
  });
  const stoppedCount = stoppedIndices.length;
  if (stoppedCount === 0) return data;

  const keepRatio = Math.max(0, 1 - reductionPercent / 100);
  let keepCount = Math.max(1, Math.round(stoppedCount * keepRatio));
  if (keepCount >= stoppedCount) return data;

  const keepSet = new Set();
  if (keepCount === 1) {
    keepSet.add(stoppedIndices[Math.floor(stoppedCount / 2)]);
  } else {
    for (let i = 0; i < keepCount; i += 1) {
      const pos = Math.round((i * (stoppedCount - 1)) / (keepCount - 1));
      keepSet.add(stoppedIndices[pos]);
    }
  }

  const lastIndex = data.length - 1;
  return data.filter((point, index) => {
    if (index === 0 || index === lastIndex) return true;
    if (!isStoppedPoint(point)) return true;
    return keepSet.has(index);
  });
}

function applyFilterAndUpdateMap() {
  const filterVal = parseInt(document.getElementById('timeFilter').value, 10);
  const stoppedFilterValue = parseInt(document.getElementById('stoppedFilter').value, 10);
  const stoppedReduction = Number.isFinite(stoppedFilterValue) ? stoppedFilterValue : 0;

  if (!rawData || rawData.length === 0) {
    updateStatsUI(0, 0);
    pausePlayback();
    setPlaybackData([]);
    return;
  }

  let filteredData = [];
  if (filterVal === 0) {
    filteredData = rawData.slice();
  } else {
    filteredData = [];
    let lastTime = null;

    rawData.forEach((point, index) => {
      if (index === 0 || index === rawData.length - 1) {
        filteredData.push(point);
        const t = parseTimeStr(point.time);
        if (t) lastTime = t.getTime();
        return;
      }

      const currentTime = parseTimeStr(point.time);
      if (!currentTime) {
        filteredData.push(point);
        return;
      }

      if (!lastTime) {
        lastTime = currentTime.getTime();
        filteredData.push(point);
        return;
      }

      const diffSeconds = (currentTime.getTime() - lastTime) / 1000;

      if (diffSeconds >= filterVal) {
        filteredData.push(point);
        lastTime = currentTime.getTime();
      }
    });
  }

  const reducedData = reduceStoppedPoints(filteredData, stoppedReduction);

  console.log(
    `Filtrado: ${rawData.length} -> ${filteredData.length} pontos (Filtro: ${filterVal}s, Parados: ${stoppedReduction}%)`
  );
  updateStatsUI(rawData.length, reducedData.length);
  mapManager.updateMap(reducedData);
  pausePlayback();
  setPlaybackData(reducedData);
}

function setCurrentRouteLabel(text) {
  const banner = document.getElementById('routeBanner');
  if (!banner) return;
  banner.innerHTML = `<i class="fa-solid fa-route" style="color: #1976d2;"></i> ${text}`;
}

function updateSpeedSliderFill(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || 1;
  const max = parseFloat(slider.max) || 30;
  const value = parseFloat(slider.value) || 1;
  const percent = ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, #1976d2 0%, #1976d2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
}

function initPlaybackControls() {
  const playPauseBtn = document.getElementById('playPause');
  const stopBtn = document.getElementById('stopPlayback');
  const speedSelect = document.getElementById('playbackSpeed');
  const progress = document.getElementById('playbackProgress');
  const tempoBaseBtn = document.getElementById('btnConfigBaseTime');

  if (!playPauseBtn || !stopBtn || !speedSelect || !progress || !tempoBaseBtn) return;

  playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  });

  stopBtn.addEventListener('click', () => {
    stopPlayback();
  });

  speedSelect.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    playbackSpeed = Number.isFinite(value) && value > 0 ? value : 1;
    // Atualiza o display da velocidade
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedDisplay) {
      speedDisplay.textContent = playbackSpeed + 'x';
    }
    // Atualiza o preenchimento visual do slider
    updateSpeedSliderFill(e.target);
    if (isPlaying) {
      pausePlayback();
      startPlayback();
    }
  });

  // Inicializa o preenchimento visual
  updateSpeedSliderFill(speedSelect);

  progress.addEventListener('input', (e) => {
    const index = parseInt(e.target.value, 10);
    const safeIndex = Number.isFinite(index) ? index : 0;
    seekPlayback(safeIndex);
  });

  tempoBaseBtn.addEventListener('click', openBaseTimeModal);

  // Handlers do modal de configuração
  initBaseTimeModal();

  updatePlaybackButtons();
  setPlaybackInfo('Parado');
}

// ========================================
// MODAL: CONFIGURAÇÃO DE TEMPO BASE
// ========================================

let pendingBaseIndex = null;

function openBaseTimeModal() {
  const modal = document.getElementById('baseTimeModal');
  if (!modal) return;

  // Sincroniza o radio selecionado com o modo atual
  const mode = playbackBaseMode || 'start';
  const radio = document.querySelector(`input[name="baseTimeOption"][value="${mode}"]`);
  if (radio) radio.checked = true;
  
  // Atualiza visual
  updateBaseTimeOptionsUI();
  
  // Se estiver em modo selected, atualiza info do ponto selecionado
  if (mode === 'selected') {
    updateSelectedOptionDetails();
  }
  
  // Se estiver em modo status e tiver status selecionado, tenta pré-selecionar
  if (mode === 'status' && playbackBaseStatus) {
    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) {
      statusSelect.value = playbackBaseStatus;
      onStatusSelectChange(); // Dispara atualização do preview
    }
  }

  modal.style.display = 'flex';
}

function closeBaseTimeModal() {
  const modal = document.getElementById('baseTimeModal');
  if (modal) modal.style.display = 'none';
}

function updateBaseTimeOptionsUI() {
  const radios = document.querySelectorAll('input[name="baseTimeOption"]');
  const selectedDetails = document.getElementById('selectedPointDetails');
  const statusDetails = document.getElementById('statusDetails');
  
  radios.forEach(radio => {
    const container = radio.closest('.config-option');
    if (radio.checked) {
      container.classList.add('selected');
    } else {
      container.classList.remove('selected');
    }
  });

  // Mostra/oculta painéis de detalhes
  const selectedMode = document.querySelector('input[name="baseTimeOption"]:checked')?.value;
  
  if (selectedDetails) selectedDetails.style.display = selectedMode === 'selected' ? 'block' : 'none';
  if (statusDetails) statusDetails.style.display = selectedMode === 'status' ? 'block' : 'none';

  // Se selecionou "Do Ponto Selecionado", atualiza o texto de instrução
  if (selectedMode === 'selected') {
    updateSelectedOptionDetails();
  }
}

function updateSelectedOptionDetails() {
  const infoEl = document.getElementById('currentSelectedInfo');
  if (!infoEl) return;

  if (playbackSelectedIndex !== null && playbackData[playbackSelectedIndex]) {
    const point = playbackData[playbackSelectedIndex];
    infoEl.innerHTML = `<strong>Ponto Selecionado:</strong> #${playbackSelectedIndex + 1} - ${point.time}`;
    infoEl.style.color = '#1565c0';
  } else {
    infoEl.innerHTML = 'Nenhum ponto selecionado. Feche esta janela e clique no ponto desejado no mapa.';
    infoEl.style.color = '#666';
  }
}

function findNearestPointByDateTime(targetDate) {
  if (!playbackData || playbackData.length === 0 || !targetDate) return null;
  
  const targetTime = targetDate.getTime();
  let nearestIndex = 0;
  let nearestDiff = Infinity;
  
  for (let i = 0; i < playbackData.length; i++) {
    const pointTime = parseTimeStr(playbackData[i]?.time);
    if (!pointTime) continue;
    
    const diff = Math.abs(pointTime.getTime() - targetTime);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
}

function onStatusSelectChange() {
  const statusSelect = document.getElementById('statusSelect');
  const dateTimeInput = document.getElementById('statusDateTime');
  
  if (!statusSelect || !dateTimeInput) return;
  
  const selectedOption = statusSelect.options[statusSelect.selectedIndex];
  const datetime = selectedOption?.dataset?.datetime || '';
  
  dateTimeInput.value = datetime;
  updateStatusPreview();
}



function updateStatusPreview() {
  const dateTimeInput = document.getElementById('statusDateTime');
  const statusSelect = document.getElementById('statusSelect');
  const resultDiv = document.getElementById('statusResult');
  const resultText = document.getElementById('statusResultText');
  
  if (!dateTimeInput.value || dateTimeInput.value.trim().length < 10) {
    resultDiv.style.display = 'none';
    pendingBaseIndex = null;
    return;
  }
  
  const targetDate = parseTimeStr(dateTimeInput.value.trim());
  if (!targetDate) {
    resultDiv.style.display = 'none';
    pendingBaseIndex = null;
    return;
  }
  
  const nearestIndex = findNearestPointByDateTime(targetDate);
  if (nearestIndex !== null && playbackData[nearestIndex]) {
    const point = playbackData[nearestIndex];
    const status = statusSelect.value || 'N/A';
    resultText.textContent = `Ponto #${nearestIndex + 1} - ${point.time}`;
    resultDiv.style.display = 'flex';
    pendingBaseIndex = nearestIndex; // Armazena temporariamente
  } else {
    resultDiv.style.display = 'none';
    pendingBaseIndex = null;
  }
}

function confirmBaseTimeConfiguration() {
  const selectedMode = document.querySelector('input[name="baseTimeOption"]:checked')?.value;
  if (!selectedMode) return;

  if (selectedMode === 'start') {
    playbackBaseMode = 'start';
    playbackBaseIndex = 0;
    playbackBaseStatus = null;
    // Não limpa playbackSelectedIndex, apenas não usa como base
  } else if (selectedMode === 'selected') {
    if (playbackSelectedIndex === null) {
      alert('Selecione um ponto no mapa primeiro.');
      return;
    }
    playbackBaseMode = 'selected';
    playbackBaseIndex = playbackSelectedIndex;
    playbackBaseStatus = null;
  } else if (selectedMode === 'status') {
    const statusSelect = document.getElementById('statusSelect');
    if (!statusSelect.value) {
      alert('Selecione um evento da equipe.');
      return;
    }
    if (pendingBaseIndex === null) {
      alert('Data/hora inválida ou ponto não encontrado.');
      return;
    }
    playbackBaseMode = 'status';
    playbackBaseIndex = pendingBaseIndex;
    playbackBaseStatus = statusSelect.value;
    
    // Atualiza o índice selecionado também para refletir no mapa
    playbackSelectedIndex = pendingBaseIndex;
    seekPlayback(pendingBaseIndex);
  }

  // Atualiza UI principal
  updateSelectedPointUI(playbackBaseIndex, playbackBaseStatus);
  updatePlaybackMarkerForIndex(playbackIndex);
  closeBaseTimeModal();
}

function initBaseTimeModal() {
  const closeBtn = document.getElementById('closeBaseTimeModal');
  const cancelBtn = document.getElementById('cancelBaseTimeModal');
  const confirmBtn = document.getElementById('confirmBaseTimeModal');
  const modal = document.getElementById('baseTimeModal');
  const radios = document.querySelectorAll('input[name="baseTimeOption"]');
  
  // Controles de Status
  const statusSelect = document.getElementById('statusSelect');
  const dateTimeInput = document.getElementById('statusDateTime');
  
  if (closeBtn) closeBtn.addEventListener('click', closeBaseTimeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeBaseTimeModal);
  if (confirmBtn) confirmBtn.addEventListener('click', confirmBaseTimeConfiguration);
  
  radios.forEach(radio => {
    radio.addEventListener('change', updateBaseTimeOptionsUI);
  });

  if (statusSelect) statusSelect.addEventListener('change', onStatusSelectChange);
  
  // Fechar ao clicar fora
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBaseTimeModal();
    });
  }
  
  // Limpar referência (botão trash na UI principal)
  const clearBtn = document.getElementById('clearBaseTime');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Reseta para o início
      playbackBaseMode = 'start';
      playbackBaseIndex = 0;
      playbackBaseStatus = null;
      updateSelectedPointUI(null);
      updatePlaybackMarkerForIndex(playbackIndex);
    });
  }
}

function confirmStatusSelection() {
  if (pendingStatusIndex === null) {
    alert('Por favor, informe a data/hora do status.');
    return;
  }
  
  const statusSelect = document.getElementById('statusSelect');
  const tempoBaseSelect = document.getElementById('tempoBase');
  const selectedStatus = statusSelect.value;
  
  // Define o ponto base
  playbackBaseMode = 'status';
  playbackBaseIndex = pendingStatusIndex;
  playbackSelectedIndex = pendingStatusIndex;
  
  // Atualiza UI com o status selecionado
  updateSelectedPointUI(pendingStatusIndex, selectedStatus);
  tempoBaseSelect.value = 'status';
  
  // Navega para o ponto
  seekPlayback(pendingStatusIndex);
  
  closeStatusModal();
}

function initStatusModal() {
  const closeBtn = document.getElementById('closeStatusModal');
  const cancelBtn = document.getElementById('cancelStatusModal');
  const confirmBtn = document.getElementById('confirmStatusModal');
  const dateTimeInput = document.getElementById('statusDateTime');
  const statusSelect = document.getElementById('statusSelect');
  const modal = document.getElementById('statusModal');
  
  if (closeBtn) closeBtn.addEventListener('click', closeStatusModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeStatusModal);
  if (confirmBtn) confirmBtn.addEventListener('click', confirmStatusSelection);
  
  if (dateTimeInput) {
    dateTimeInput.addEventListener('input', updateStatusPreview);
    dateTimeInput.addEventListener('change', updateStatusPreview);
  }
  if (statusSelect) statusSelect.addEventListener('change', onStatusSelectChange);
  
  // Fechar ao clicar fora
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeStatusModal();
    });
  }
}

function setPlaybackInfo(html) {
  const info = document.getElementById('playbackInfo');
  if (!info) return;
  info.innerHTML = html;
}

// Variáveis para armazenar coordenadas atuais
let currentLat = null;
let currentLng = null;

/**
 * Atualiza a UI com as coordenadas atuais
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function updateCoordsUI(lat, lng) {
  const latEl = document.getElementById('currentLat');
  const lngEl = document.getElementById('currentLng');
  
  if (!latEl || !lngEl) return;
  
  // Formata com 6 casas decimais
  const formattedLat = typeof lat === 'number' && Number.isFinite(lat) 
    ? lat.toFixed(6) 
    : '-';
  const formattedLng = typeof lng === 'number' && Number.isFinite(lng) 
    ? lng.toFixed(6) 
    : '-';
  
  latEl.textContent = formattedLat;
  lngEl.textContent = formattedLng;
  
  // Armazena valores atuais
  currentLat = lat;
  currentLng = lng;
}

/**
 * Abre a localização atual no Google Maps
 */
function openGoogleMaps() {
  if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) {
    alert('Nenhuma coordenada disponível. Aguarde carregar a rota ou inicie a reprodução.');
    return;
  }
  
  const url = `https://www.google.com/maps?q=${currentLat},${currentLng}`;
  window.open(url, '_blank');
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '-';
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(fromPoint, toPoint) {
  if (!fromPoint || !toPoint) return 0;
  const lat1 = Number(fromPoint.lat);
  const lng1 = Number(fromPoint.lng);
  const lat2 = Number(toPoint.lat);
  const lng2 = Number(toPoint.lng);
  if (![lat1, lng1, lat2, lng2].every((val) => Number.isFinite(val))) return 0;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function buildPlaybackDistances(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const distances = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i += 1) {
    distances[i] = distances[i - 1] + calculateDistanceKm(data[i - 1], data[i]);
  }
  return distances;
}

function getDistanceFromBase(totalDistanceKm) {
  const baseDistanceKm = playbackDistances[playbackBaseIndex] ?? 0;
  const delta = totalDistanceKm - baseDistanceKm;
  return Math.abs(delta);
}

function updatePlaybackButtons() {
  const playPauseBtn = document.getElementById('playPause');
  if (!playPauseBtn) return;
  playPauseBtn.innerHTML = isPlaying 
    ? '<i class="fa-solid fa-pause"></i> Pause' 
    : '<i class="fa-solid fa-play"></i> Play';
}

function setPlaybackData(data) {
  playbackData = Array.isArray(data) ? data : [];
  playbackIndex = 0;
  playbackDistances = buildPlaybackDistances(playbackData);
  playbackBaseIndex = 0;
  playbackSelectedIndex = null;
  stopPlaybackAnimation();
  
  // Limpa a UI do ponto selecionado
  updateSelectedPointUI(null);

  const progress = document.getElementById('playbackProgress');
  if (progress) {
    progress.max = Math.max(playbackData.length - 1, 0);
    progress.value = 0;
  }

  if (playbackData.length > 0) {
    updatePlaybackMarkerForIndex(0);
  } else {
    mapManager.clearPlaybackMarker();
    setPlaybackInfo('Sem dados');
  }
}

function seekPlayback(index) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(playbackData.length - 1, 0));
  const wasPlaying = isPlaying;
  pausePlayback();
  playbackIndex = safeIndex;
  updatePlaybackMarkerForIndex(playbackIndex);
  if (wasPlaying) {
    startPlayback();
  }
}

function updatePlaybackMarkerForIndex(index) {
  const point = playbackData[index];
  if (!point) return;
  const distanceKm = playbackDistances[index] ?? 0;
  const adjustedDistanceKm = getDistanceFromBase(distanceKm);
  const basePoint = playbackData[playbackBaseIndex];
  const currentTime = parseTimeStr(point?.time);
  const baseTime = parseTimeStr(basePoint?.time);
  
  // Calcula tempo decorrido desde o ponto base (valor absoluto)
  let elapsedSeconds = null;
  if (currentTime && baseTime) {
    elapsedSeconds = Math.abs(currentTime.getTime() - baseTime.getTime()) / 1000;
  }
  const elapsedText = elapsedSeconds !== null ? formatDuration(elapsedSeconds) : '-';
  
  // Obtém status da equipe para o horário do ponto
  const teamStatus = getTeamStatusForTime(point.time);
  
  mapManager.updatePlaybackMarker(point, adjustedDistanceKm, elapsedText, teamStatus);
  const title = point.name || 'Equipe';
  const speed = point.speed || '-';
  const time = point.time || '-';
  const position = `${index + 1}/${playbackData.length}`;
  const distanceText = `${adjustedDistanceKm.toFixed(2)} km`;
  setPlaybackInfo(
    `<div style="display:flex; justify-content:space-between; margin-bottom:2px; font-weight:bold;">
       <span><i class="fa-solid fa-truck-medical"></i> ${title}</span>
       <span>${position}</span>
     </div>
     <div style="display:flex; gap:4px; font-size:11px; flex-wrap:wrap; justify-content: space-between;">
       <span class="info-stat-item" title="Velocidade"><i class="fa-solid fa-gauge"></i> ${speed}</span>
       <span class="info-stat-item" title="Horário"><i class="fa-regular fa-clock"></i> ${time}</span>
       <span class="info-stat-item" title="Distância"><i class="fa-solid fa-road"></i> ${distanceText}</span>
       <span class="info-stat-item" title="Tempo Decorrido"><i class="fa-solid fa-stopwatch"></i> ${elapsedText}</span>
     </div>`
  );
  
  // Atualiza coordenadas no painel
  updateCoordsUI(point.lat, point.lng);
  
  const progress = document.getElementById('playbackProgress');
  if (progress) {
    progress.value = index;
  }
}

function getDelayForIndex(index) {
  const baseDelay = 1000;
  const safeSpeed = Number.isFinite(playbackSpeed) && playbackSpeed > 0 ? playbackSpeed : 1;
  return Math.max(50, baseDelay / safeSpeed);
}

function stopPlaybackAnimation() {
  if (playbackAnimationFrame) {
    cancelAnimationFrame(playbackAnimationFrame);
    playbackAnimationFrame = null;
  }
}

// ========================================
// SISTEMA DE ANIMAÇÃO CONTÍNUA
// ========================================

let continuousAnimationStartTime = null;
let continuousAnimationSegmentStart = 0;

/**
 * Calcula o tempo total acumulado até um determinado índice
 * @param {number} targetIndex - Índice alvo
 * @returns {number} Tempo em milissegundos
 */
function getAccumulatedTimeForIndex(targetIndex) {
  let totalTime = 0;
  const safeSpeed = Number.isFinite(playbackSpeed) && playbackSpeed > 0 ? playbackSpeed : 1;
  const baseDelay = 1000 / safeSpeed;

  for (let i = 0; i < targetIndex && i < playbackData.length - 1; i++) {
    totalTime += baseDelay;
  }
  return totalTime;
}

/**
 * Encontra o segmento atual baseado no tempo decorrido
 * @param {number} elapsedTime - Tempo decorrido desde o início
 * @returns {Object} {segmentIndex, segmentProgress}
 */
function findSegmentForTime(elapsedTime) {
  const safeSpeed = Number.isFinite(playbackSpeed) && playbackSpeed > 0 ? playbackSpeed : 1;
  const baseDelay = 1000 / safeSpeed;

  let accumulatedTime = 0;

  for (let i = 0; i < playbackData.length - 1; i++) {
    const segmentDuration = baseDelay;
    if (elapsedTime < accumulatedTime + segmentDuration) {
      const segmentProgress = (elapsedTime - accumulatedTime) / segmentDuration;
      return { segmentIndex: i, segmentProgress: Math.max(0, Math.min(1, segmentProgress)) };
    }
    accumulatedTime += segmentDuration;
  }

  // Chegou ao final
  return { segmentIndex: playbackData.length - 2, segmentProgress: 1 };
}

/**
 * Interpola a posição usando Catmull-Rom para um segmento específico
 * @param {number} segmentIndex - Índice do segmento
 * @param {number} progress - Progresso no segmento [0, 1]
 * @returns {Object} {lat, lng}
 */
function interpolatePositionForSegment(segmentIndex, progress) {
  if (segmentIndex < 0 || segmentIndex >= playbackData.length - 1) {
    const point = playbackData[Math.max(0, Math.min(segmentIndex, playbackData.length - 1))];
    return { lat: point?.lat || 0, lng: point?.lng || 0 };
  }

  // Pontos de controle Catmull-Rom
  const p0 = segmentIndex > 0 ? playbackData[segmentIndex - 1] : playbackData[segmentIndex];
  const p1 = playbackData[segmentIndex];
  const p2 = playbackData[segmentIndex + 1];
  const p3 =
    segmentIndex < playbackData.length - 2
      ? playbackData[segmentIndex + 2]
      : playbackData[segmentIndex + 1];

  // Coordenadas como objetos
  const coords = [p0, p1, p2, p3].map((p) => ({
    lat: Number(p?.lat) || 0,
    lng: Number(p?.lng) || 0,
  }));

  // Interpola usando Catmull-Rom (sem easing - fluxo contínuo)
  return catmullRomInterpolate(progress, coords[0], coords[1], coords[2], coords[3], 0.5);
}

/**
 * Atualiza a UI com informações do ponto mais próximo
 * @param {number} segmentIndex - Índice do segmento atual
 * @param {number} segmentProgress - Progresso dentro do segmento [0, 1]
 * @param {Object} interpolatedPosition - Posição interpolada {lat, lng}
 */
function updatePlaybackUIForSegment(segmentIndex, segmentProgress = 0, interpolatedPosition = null) {
  const point = playbackData[segmentIndex];
  const nextPoint = playbackData[segmentIndex + 1];
  if (!point) return;

  // Interpola a distância baseada no progresso do segmento
  const currentDistanceKm = playbackDistances[segmentIndex] ?? 0;
  const nextDistanceKm = playbackDistances[segmentIndex + 1] ?? currentDistanceKm;
  const interpolatedDistanceKm = currentDistanceKm + (nextDistanceKm - currentDistanceKm) * segmentProgress;
  const adjustedDistanceKm = getDistanceFromBase(interpolatedDistanceKm);

  // Calcula tempo decorrido interpolado
  const basePoint = playbackData[playbackBaseIndex];
  const currentTime = parseTimeStr(point?.time);
  const nextTime = nextPoint ? parseTimeStr(nextPoint?.time) : currentTime;
  const baseTime = parseTimeStr(basePoint?.time);

  let elapsedSeconds = null;
  if (currentTime && baseTime) {
    const currentElapsed = Math.abs(currentTime.getTime() - baseTime.getTime()) / 1000;
    if (nextTime && nextPoint) {
      const nextElapsed = Math.abs(nextTime.getTime() - baseTime.getTime()) / 1000;
      // Interpola entre o tempo atual e o próximo baseado no progresso do segmento
      elapsedSeconds = currentElapsed + (nextElapsed - currentElapsed) * segmentProgress;
    } else {
      elapsedSeconds = currentElapsed;
    }
  }
  const elapsedText = elapsedSeconds !== null ? formatDuration(elapsedSeconds) : '-';

  // Interpola velocidade se possível
  const speed = point.speed || '-';

  const title = point.name || 'Equipe';
  const time = point.time || '-';
  const position = `${segmentIndex + 1}/${playbackData.length}`;
  const distanceText = `${adjustedDistanceKm.toFixed(2)} km`;

  setPlaybackInfo(
    `<div style="display:flex; justify-content:space-between; margin-bottom:2px; font-weight:bold;">
       <span><i class="fa-solid fa-truck-medical"></i> ${title}</span>
       <span>${position}</span>
     </div>
     <div style="display:flex; gap:4px; font-size:11px; flex-wrap:wrap; justify-content: space-between;">
       <span class="info-stat-item" title="Velocidade"><i class="fa-solid fa-gauge"></i> ${speed}</span>
       <span class="info-stat-item" title="Horário"><i class="fa-regular fa-clock"></i> ${time}</span>
       <span class="info-stat-item" title="Distância"><i class="fa-solid fa-road"></i> ${distanceText}</span>
       <span class="info-stat-item" title="Tempo Decorrido"><i class="fa-solid fa-stopwatch"></i> ${elapsedText}</span>
     </div>`
  );

  const progress = document.getElementById('playbackProgress');
  if (progress) {
    progress.value = segmentIndex;
  }

  // Atualiza coordenadas no painel (usa posição interpolada se disponível)
  if (interpolatedPosition) {
    updateCoordsUI(interpolatedPosition.lat, interpolatedPosition.lng);
  } else {
    updateCoordsUI(point.lat, point.lng);
  }

  // Atualiza o popup do marcador com dados interpolados
  if (interpolatedPosition) {
    const teamStatus = getTeamStatusForTime(point.time);
    mapManager.updatePlaybackMarkerPopup(point, adjustedDistanceKm, elapsedText, teamStatus);
  }
}

/**
 * Loop de animação contínua - executa sem paradas entre pontos
 */
function continuousAnimationLoop(timestamp) {
  if (!isPlaying || playbackData.length < 2) return;

  if (continuousAnimationStartTime === null) {
    continuousAnimationStartTime = timestamp;
  }

  const elapsedTime = timestamp - continuousAnimationStartTime + continuousAnimationSegmentStart;
  const { segmentIndex, segmentProgress } = findSegmentForTime(elapsedTime);

  // Verifica se chegou ao final
  if (segmentIndex >= playbackData.length - 2 && segmentProgress >= 1) {
    // Posiciona no último ponto
    const lastPoint = playbackData[playbackData.length - 1];
    mapManager.updatePlaybackMarkerPosition(lastPoint.lat, lastPoint.lng);
    updatePlaybackUIForSegment(playbackData.length - 1, 0, null);
    playbackIndex = playbackData.length - 1;
    pausePlayback();
    return;
  }

  // Interpola posição usando Catmull-Rom
  const interpolated = interpolatePositionForSegment(segmentIndex, segmentProgress);

  // Atualiza marcador (o mapa seguirá automaticamente)
  mapManager.updatePlaybackMarkerPosition(interpolated.lat, interpolated.lng);

  // Atualiza UI e popup continuamente
  playbackIndex = segmentIndex;
  updatePlaybackUIForSegment(segmentIndex, segmentProgress, interpolated);

  // Continua a animação
  playbackAnimationFrame = requestAnimationFrame(continuousAnimationLoop);
}

/**
 * Inicia a animação contínua a partir do índice atual
 */
function startContinuousAnimation() {
  stopPlaybackAnimation();

  // Calcula o tempo inicial baseado no índice atual
  continuousAnimationSegmentStart = getAccumulatedTimeForIndex(playbackIndex);
  continuousAnimationStartTime = null;

  // Atualiza o marcador para a posição inicial
  const startPoint = playbackData[playbackIndex];
  if (startPoint) {
    mapManager.updatePlaybackMarker(
      startPoint,
      getDistanceFromBase(playbackDistances[playbackIndex] ?? 0),
      formatDuration(0)
    );
  }

  // Inicia o loop de animação
  playbackAnimationFrame = requestAnimationFrame(continuousAnimationLoop);
}

function scheduleNextStep() {
  if (!isPlaying || playbackData.length === 0) return;
  startContinuousAnimation();
}

function startPlayback() {
  if (playbackData.length === 0) return;
  if (playbackIndex >= playbackData.length) {
    playbackIndex = 0;
  }
  isPlaying = true;
  updatePlaybackButtons();
  scheduleNextStep();
}

function pausePlayback() {
  if (playbackTimer) {
    clearTimeout(playbackTimer);
    playbackTimer = null;
  }
  stopPlaybackAnimation();
  isPlaying = false;
  updatePlaybackButtons();
}

function stopPlayback() {
  pausePlayback();
  playbackIndex = 0;
  if (playbackData.length > 0) {
    updatePlaybackMarkerForIndex(0);
  } else {
    setPlaybackInfo('Parado');
  }
}

async function loadDefaultJson() {
  if (!defaultJsonFile) return;

  try {
    const response = await fetch(defaultJsonFile, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      rawData = data;
      setCurrentRouteLabel('Rota atual: USB PLANALTINA II');
      applyFilterAndUpdateMap();
    }
  } catch (error) {
    return;
  }
}

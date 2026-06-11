import { updateMeasureResult } from './ui.js';

export class MapManager {
  constructor(mapId) {
    this.map = null;
    this.currentPolyline = null;
    this.currentMarkers = [];
    this.playbackMarker = null;
    this.onPointSelected = null;
    this.isMeasuring = false;
    this.measurePoints = [];
    this.routeData = [];
    this.mapId = mapId;
  }

  init() {
    // Camadas Base
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    });

    const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap'
    });

    // Inicializa o mapa com a camada padrão (OSM)
    this.map = L.map(this.mapId, {
      layers: [osmLayer]
    });

    // Adiciona controle de camadas no canto inferior direito
    const baseMaps = {
      "Mapa Padrão": osmLayer,
      "Mapa Claro": voyagerLayer,
      "Satélite": satelliteLayer,
      "Modo Escuro": darkLayer,
      "Topografia": topoLayer
    };

    L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(this.map);

    // Centraliza num ponto padrão (Brasilia)
    this.map.setView([-15.793889, -47.882778], 12);
  }

  setMeasureMode(enabled) {
    this.isMeasuring = enabled;
    if (!enabled) {
      this.clearMeasurement();
    }
  }

  clearMeasurement() {
    this.measurePoints.forEach((p) => {
      p.marker.setStyle({ color: '#3388ff', fillColor: '#3388ff' });
    });
    this.measurePoints = [];
    updateMeasureResult(this.measurePoints);
  }

  onMarkerClick(e, point, pointIndex) {
    if (!this.isMeasuring) return;

    e.originalEvent.stopPropagation();
    e.target.closePopup();

    const marker = e.target;

    // Verifica se já está selecionado
    const existingIndex = this.measurePoints.findIndex((p) => p.marker === marker);
    if (existingIndex !== -1) {
      this.measurePoints.splice(existingIndex, 1);
      marker.setStyle({ color: '#3388ff', fillColor: '#3388ff' });
      updateMeasureResult(this.measurePoints, this.routeData);
      return;
    }

    if (this.measurePoints.length >= 2) {
      const oldPoint = this.measurePoints.shift();
      oldPoint.marker.setStyle({ color: '#3388ff', fillColor: '#3388ff' });
    }

    this.measurePoints.push({
      lat: point.lat,
      lng: point.lng,
      marker: marker,
      name: point.name,
      index: pointIndex,
    });

    marker.setStyle({ color: '#ff0000', fillColor: '#ff0000' });
    updateMeasureResult(this.measurePoints, this.routeData);
  }

  updateMap(data) {
    this.clearPlaybackMarker();
    this.routeData = data; // Armazena para cálculo de distância percorrida
    if (this.currentPolyline) {
      this.map.removeLayer(this.currentPolyline);
    }

    this.currentMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.currentMarkers = [];

    if (data.length === 0) return;

    this.map.setView([data[0].lat, data[0].lng], 16);

    const pathCoordinates = data.map((point) => [point.lat, point.lng]);

    this.currentPolyline = L.polyline(pathCoordinates, {
      color: 'red',
      weight: 3,
      opacity: 1.0,
      smoothFactor: 1,
    }).addTo(this.map);

    this.map.fitBounds(this.currentPolyline.getBounds());

    data.forEach((point, index) => {
      if (index === 0) {
        const startMarker = L.marker([point.lat, point.lng], {
          title: 'Início',
          icon: L.divIcon({
            className: 'route-marker start-marker',
            html: '<i class="fa-solid fa-location-dot"></i>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        })
          .addTo(this.map)
          .bindPopup('<b>Início</b>');
        startMarker.on('click', (e) => {
          this.onMarkerClick(e, point, index);
          if (this.onPointSelected) this.onPointSelected(point, index);
        });
        this.currentMarkers.push(startMarker);
        return;
      } else if (index === data.length - 1) {
        const endMarker = L.marker([point.lat, point.lng], {
          title: 'Fim',
          icon: L.divIcon({
            className: 'route-marker end-marker',
            html: '<i class="fa-solid fa-flag-checkered"></i>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        })
          .addTo(this.map)
          .bindPopup('<b>Fim</b>');
        endMarker.on('click', (e) => {
          this.onMarkerClick(e, point, index);
          if (this.onPointSelected) this.onPointSelected(point, index);
        });
        this.currentMarkers.push(endMarker);
        return;
      }

      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: '#3388ff',
        color: '#3388ff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(this.map);

      marker.on('click', (e) => {
        this.onMarkerClick(e, point, index);
        if (this.onPointSelected) this.onPointSelected(point, index);
      });

      // Sem popup nos pontos intermediários - informações aparecem no playback marker
      this.currentMarkers.push(marker);
    });
  }

  clearPlaybackMarker() {
    if (this.playbackMarker) {
      this.map.removeLayer(this.playbackMarker);
      this.playbackMarker = null;
    }
  }

  updatePlaybackMarker(point, distanceKm = null, elapsedText = null, teamStatus = null) {
    if (!this.map || !point) return;

    const distanceText =
      typeof distanceKm === 'number' && Number.isFinite(distanceKm)
        ? `${distanceKm.toFixed(2)} km`
        : '-';
    const elapsedVal =
      typeof elapsedText === 'string' && elapsedText && elapsedText !== '-'
        ? elapsedText
        : '-';
    const statusVal =
      typeof teamStatus === 'string' && teamStatus
        ? teamStatus
        : 'Disponível';

    const popupContent = `
      <div class="info-window standard-list">
          <h3 class="popup-title"><i class="fa-solid fa-truck-medical"></i> ${point.name || 'Equipe'}</h3>
          <div class="list-item"><i class="fa-regular fa-clock"></i> <strong>Data/Hora:</strong> ${point.time || '-'}</div>
          <div class="list-item"><i class="fa-solid fa-gauge-high"></i> <strong>Velocidade:</strong> ${point.speed || '-'}</div>
          <div class="list-item"><i class="fa-solid fa-road"></i> <strong>Distância:</strong> ${distanceText}</div>
          <div class="list-item"><i class="fa-solid fa-stopwatch"></i> <strong>Tempo Deslocamento:</strong> ${elapsedVal}</div>
          <div class="list-item"><i class="fa-solid fa-clipboard-check"></i> <strong>Status:</strong> ${statusVal}</div>
          <div class="list-item"><i class="fa-solid fa-location-crosshairs"></i> <strong>Lat:</strong> ${point.lat}</div>
          <div class="list-item"><i class="fa-solid fa-location-crosshairs"></i> <strong>Lng:</strong> ${point.lng}</div>
      </div>
    `;

    if (!this.playbackMarker) {
      this.playbackMarker = L.marker([point.lat, point.lng], {
        title: point.name || 'Equipe',
      }).addTo(this.map);
      this.playbackMarker.bindPopup(popupContent, {
        closeOnClick: false,
        autoClose: false,
      });
    } else {
      this.playbackMarker.setLatLng([point.lat, point.lng]);
      this.playbackMarker.setPopupContent(popupContent);
    }

    this.playbackMarker.openPopup();

    // Centralização inicial do marcador (com animação)
    this.centerOnPlaybackMarker(point.lat, point.lng, false);
  }

  /**
   * Centraliza o mapa no marcador de playback
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {boolean} instant - Se true, centraliza instantaneamente (para reprodução contínua)
   */
  centerOnPlaybackMarker(lat, lng, instant = false) {
    if (!this.map) return;

    const targetLatLng = [lat, lng];

    if (instant) {
      // Durante reprodução contínua: centralização imediata sem animação
      this.map.setView(targetLatLng, this.map.getZoom(), { animate: false });
    } else {
      // Para eventos pontuais: animação suave
      this.map.panTo(targetLatLng, {
        animate: true,
        duration: 0.3,
        easeLinearity: 0.5,
      });
    }
  }

  updatePlaybackMarkerPosition(lat, lng) {
    if (!this.playbackMarker) return;
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;

    this.playbackMarker.setLatLng([nextLat, nextLng]);

    // Durante reprodução contínua: centralização INSTANTÂNEA para acompanhar o movimento
    // O movimento já é suave pelo Catmull-Rom, não precisa de animação adicional no mapa
    this.centerOnPlaybackMarker(nextLat, nextLng, true);
  }

  /**
   * Atualiza apenas o conteúdo do popup do marcador de playback
   * @param {Object} point - Dados do ponto atual
   * @param {number} distanceKm - Distância interpolada em km
   * @param {string} elapsedText - Tempo decorrido formatado
   */
  updatePlaybackMarkerPopup(point, distanceKm, elapsedText, teamStatus = null) {
    if (!this.playbackMarker || !point) return;

    const distText =
      typeof distanceKm === 'number' && Number.isFinite(distanceKm)
        ? `${distanceKm.toFixed(2)} km`
        : '-';
    const timeText =
      elapsedText && elapsedText !== '-' ? elapsedText : '-';
    const statusVal = teamStatus || 'Disponível';

    const popupContent = `
      <div class="info-window standard-list">
          <h3 class="popup-title"><i class="fa-solid fa-truck-medical"></i> ${point.name || 'Equipe'}</h3>
          <div class="list-item"><i class="fa-regular fa-clock"></i> <strong>Data/Hora:</strong> ${point.time || '-'}</div>
          <div class="list-item"><i class="fa-solid fa-gauge-high"></i> <strong>Velocidade:</strong> ${point.speed || '-'}</div>
          <div class="list-item"><i class="fa-solid fa-road"></i> <strong>Distância:</strong> ${distText}</div>
          <div class="list-item"><i class="fa-solid fa-stopwatch"></i> <strong>Tempo Deslocamento:</strong> ${timeText}</div>
          <div class="list-item"><i class="fa-solid fa-clipboard-check"></i> <strong>Status:</strong> ${statusVal}</div>
          <div class="list-item"><i class="fa-solid fa-location-crosshairs"></i> <strong>Lat:</strong> ${point.lat}</div>
          <div class="list-item"><i class="fa-solid fa-location-crosshairs"></i> <strong>Lng:</strong> ${point.lng}</div>
      </div>
    `;

    this.playbackMarker.setPopupContent(popupContent);
  }

  setPointClickHandler(handler) {
    this.onPointSelected = handler;
  }
}

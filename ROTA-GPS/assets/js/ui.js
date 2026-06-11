export function updateStatsUI(total, current) {
  const statsDiv = document.getElementById('pointsStats');
  if (!total) {
    statsDiv.style.display = 'none';
    return;
  }

  statsDiv.style.display = 'block';

  if (total === current) {
    statsDiv.innerHTML = `<strong>Total de Pontos:</strong> ${total}`;
  } else {
    const removed = total - current;
    const percent = ((removed / total) * 100).toFixed(1);
    statsDiv.innerHTML = `
      <div><strong>Original:</strong> ${total}</div>
      <div style="color: #d32f2f;"><strong>Reduzido:</strong> -${removed} (${percent}%)</div>
      <div style="color: #2e7d32;"><strong>Exibindo:</strong> ${current}</div>
    `;
  }
}

export function updateMeasureResult(measurePoints, routeData = []) {
  const resultDiv = document.getElementById('measureResult');
  const clearBtn = document.getElementById('clearMeasure');
  const measureTip = document.getElementById('measureTip');
  const measureTipText = document.getElementById('measureTipText');

  if (measurePoints.length === 0) {
    resultDiv.textContent = '-';
    clearBtn.style.display = 'none';
  } else if (measurePoints.length === 1) {
    resultDiv.innerHTML = '<i class="fa-solid fa-location-dot" style="color:#4caf50"></i> A ✓';
    clearBtn.style.display = 'inline-flex';
    // Atualiza dica
    if (measureTip && measureTipText) {
      measureTipText.textContent = 'Ponto A marcado! Agora clique no ponto B para calcular a distância.';
      measureTip.style.display = 'flex';
    }
  } else if (measurePoints.length === 2) {
    // Calcula distância percorrida ao longo da rota
    const idx1 = measurePoints[0].index;
    const idx2 = measurePoints[1].index;
    
    const startIdx = Math.min(idx1, idx2);
    const endIdx = Math.max(idx1, idx2);
    
    let totalDist = 0;
    
    // Soma as distâncias de cada segmento entre os pontos
    for (let i = startIdx; i < endIdx; i++) {
      if (routeData[i] && routeData[i + 1]) {
        const p1 = L.latLng(routeData[i].lat, routeData[i].lng);
        const p2 = L.latLng(routeData[i + 1].lat, routeData[i + 1].lng);
        totalDist += p1.distanceTo(p2);
      }
    }

    let distStr = '';
    if (totalDist < 1000) {
      distStr = `${Math.round(totalDist)} m`;
    } else {
      distStr = `${(totalDist / 1000).toFixed(2)} km`;
    }

    // Mostra também quantos pontos no trecho
    const numPoints = endIdx - startIdx + 1;
    resultDiv.innerHTML = `<i class="fa-solid fa-road" style="color:#1976d2"></i> <strong>${distStr}</strong> <small>(${numPoints} pts)</small>`;
    clearBtn.style.display = 'inline-flex';
    
    // Atualiza dica com resultado
    if (measureTip && measureTipText) {
      measureTipText.textContent = `Distância percorrida: ${distStr} em ${numPoints} pontos. Clique no botão borracha para medir outro trecho.`;
      measureTip.style.display = 'flex';
    }
  }
}

/**
 * Global Navbar Component — Protótipos INOVA
 * Injeta a sidebar de navegação dinamicamente em qualquer página.
 *
 * Uso:
 *   <nav id="main-navbar" class="sidebar"></nav>
 *   <div class="sidebar-overlay" id="sidebarOverlay"></div>
 *   <script src="[basePath]assets/js/global-navbar.js"></script>
 *
 * O basePath é auto-detectado a partir do atributo data-base
 * no próprio <script>, ou inferido pela URL da página.
 */

const GlobalNavbar = (function () {
  'use strict';

  /**
   * Detecta o basePath (caminho relativo até a raiz do projeto)
   * baseado no pathname da página atual.
   */
  function detectBasePath() {
    // Tenta pegar do atributo data-base do script
    const script = document.querySelector('script[data-component="global-navbar"]');
    if (script && script.dataset.base) {
      return script.dataset.base;
    }

    // Auto-detecta pela URL
    const path = window.location.pathname;

    // Páginas na raiz: /painel.html, /index.html
    if (/^\/[^/]*\.html?$/.test(path) || path === '/') {
      return '';
    }

    // Páginas em subpasta de 1 nível: /NUTRAN-CHECKLIST/, /ROTA-GPS/
    if (/^\/[^/]+\/(index\.html?)?$/.test(path)) {
      return '../';
    }

    // Fallback: conta os níveis de profundidade
    const segments = path.split('/').filter(s => s && !s.includes('.'));
    return '../'.repeat(segments.length);
  }

  /**
   * Gera o HTML da sidebar completa
   */
  function buildHTML(basePath) {
    return `
      <!-- Header da Sidebar -->
      <div class="sidebar__header">
        <div class="sidebar__title-section">
          <div class="sidebar__logo-text" aria-label="Logo Protótipos">
            <i class="fa-solid fa-layer-group sidebar__logo-icon" aria-hidden="true"></i>
            <span class="sidebar__logo-label">PROTÓTIPOS</span>
          </div>
          <button
            id="nav-toggle"
            class="nav-toggle"
            aria-label="Alternar visibilidade do menu lateral"
            aria-expanded="true"
            aria-controls="main-navbar"
          >
            <img
              src="${basePath}assets/icons/retrair-expandir.svg"
              alt=""
              class="nav-toggle__icon"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <!-- Links de Navegação -->
      <div class="nav-links">
        <div class="nav-links-container">
          <a
            href="${basePath}painel.html"
            class="nav-link"
            data-page="painel"
            data-path="painel"
            data-tooltip="PAINEL"
            role="menuitem"
            aria-label="Ir para o Painel"
          >
            <i class="fas fa-house nav-link__icon-fa" aria-hidden="true"></i>
            <span class="nav-link__text">PAINEL</span>
          </a>

          <a
            href="${basePath}NUTRAN-CHECKLIST/"
            class="nav-link"
            data-page="nutran-checklist"
            data-path="NUTRAN-CHECKLIST"
            data-tooltip="NUTRAN CHECKLIST"
            role="menuitem"
            aria-label="Ir para NUTRAN Checklist"
          >
            <i class="fas fa-clipboard-check nav-link__icon-fa" aria-hidden="true"></i>
            <span class="nav-link__text">NUTRAN CHECKLIST</span>
          </a>

          <a
            href="${basePath}ROTA-GPS/"
            class="nav-link"
            data-page="rota-gps"
            data-path="ROTA-GPS"
            data-tooltip="ROTA GPS"
            role="menuitem"
            aria-label="Ir para Rota GPS"
          >
            <i class="fas fa-map-location-dot nav-link__icon-fa" aria-hidden="true"></i>
            <span class="nav-link__text">ROTA GPS</span>
          </a>

          <a
            href="#"
            class="nav-link"
            id="logoutBtn"
            data-tooltip="Sair do Sistema"
            role="menuitem"
            aria-label="Sair do sistema"
          >
            <i class="fas fa-right-from-bracket nav-link__icon-fa" aria-hidden="true"></i>
            <span class="nav-link__text">SAIR</span>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Inicializa a navbar global
   */
  function init(options) {
    const basePath = (options && options.basePath != null) ? options.basePath : detectBasePath();
    const container = document.getElementById('main-navbar');

    if (!container) {
      console.warn('[GlobalNavbar] Elemento #main-navbar não encontrado.');
      return;
    }

    // Garante as classes necessárias
    if (!container.classList.contains('sidebar')) {
      container.classList.add('sidebar');
    }
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Navegação principal');

    // Injeta o HTML
    container.innerHTML = buildHTML(basePath);
  }

  return { init, detectBasePath };
})();

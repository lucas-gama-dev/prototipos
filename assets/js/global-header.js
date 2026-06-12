/**
 * Global Header Component — Protótipos INOVA
 * Injeta o header dinamicamente em qualquer página.
 *
 * Uso:
 *   <header id="main-header" class="main-header"></header>
 *   <script src="[basePath]assets/js/global-header.js"></script>
 *
 * Configuração via init():
 *   GlobalHeader.init({ title: 'PAINEL', subtitle: 'Painel de protótipos...' })
 */

const GlobalHeader = (function () {
  'use strict';

  /** SVG do ícone de sol */
  const SUN_SVG = `
    <svg class="sun-icon" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" />
      <path d="M12 2V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M12 20V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M4 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M22 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M19.7778 4.22266L17.5558 6.25424" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M4.22217 4.22266L6.44418 6.25424" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M6.44434 17.5557L4.22211 19.7779" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M19.7778 19.7773L17.5558 17.5551" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>`;

  /** SVG do ícone de lua */
  const MOON_SVG = `
    <svg class="moon-icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>`;

  /**
   * Gera o HTML do header
   */
  function buildHTML(title, subtitle) {
    return `
      <div class="header-content">
        <!-- Mobile hamburger -->
        <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Abrir menu">
          <i class="fas fa-bars"></i>
        </button>

        <!-- Título -->
        <div class="header-info">
          <h1 class="header-title">${title}</h1>
          ${subtitle ? `<span class="header-subtitle">${subtitle}</span>` : ''}
        </div>

        <!-- Ações -->
        <div class="header-actions">
          <span class="header-datetime" id="headerDatetime"></span>

          <!-- Tema toggle -->
          <div class="theme-toggle-wrapper">
            <input
              type="checkbox"
              id="themeToggle"
              class="theme-toggle"
              aria-label="Alternar tema claro/escuro"
            />
            <label for="themeToggle" class="theme-toggle-label">
              <div class="slider-icons">
                ${SUN_SVG}
                ${MOON_SVG}
              </div>
            </label>
          </div>

          <!-- Perfil/Sair -->
          <a href="#" class="header-profile-button" id="logoutBtnHeader" title="Sair">
            <span class="header-profile-avatar">
              <i class="fas fa-user"></i>
            </span>
            <span>Sair</span>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Inicializa o toggle de tema
   */
  function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const html = document.documentElement;
    const theme = localStorage.getItem('theme') || 'light';
    toggle.checked = theme === 'dark';

    toggle.addEventListener('change', function () {
      const isDark = this.checked;
      const newTheme = isDark ? 'dark' : 'light';

      if (isDark) {
        html.setAttribute('data-theme', 'dark');
        html.classList.add('dark', 'dark-theme');
        html.style.cssText =
          'background-color: #0f0f0f !important; color: #f8fafc !important;';
      } else {
        html.setAttribute('data-theme', 'light');
        html.classList.remove('dark', 'dark-theme');
        html.style.cssText =
          'background-color: #e5e7eb !important; color: #1a1a1a !important;';
      }

      localStorage.setItem('theme', newTheme);
    });
  }

  /**
   * Inicializa o logout do header
   */
  function initLogout() {
    const logoutHeader = document.getElementById('logoutBtnHeader');
    if (!logoutHeader) return;

    logoutHeader.addEventListener('click', function (e) {
      e.preventDefault();
      // Usa AuthSystem se disponível
      if (typeof AuthSystem !== 'undefined' && AuthSystem.logout) {
        AuthSystem.logout();
      }
      // Limpa legado
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      // Redireciona para a raiz (login)
      const basePath = (typeof GlobalNavbar !== 'undefined')
        ? GlobalNavbar.detectBasePath()
        : '/';
      window.location.href = basePath || '/';
    });
  }

  /**
   * Inicializa o header global
   * @param {Object} options - { title: string, subtitle?: string }
   */
  function init(options) {
    const title = (options && options.title) || 'PAINEL';
    const subtitle = (options && options.subtitle) || '';

    const container = document.getElementById('main-header');

    if (!container) {
      console.warn('[GlobalHeader] Elemento #main-header não encontrado.');
      return;
    }

    // Garante a classe necessária
    if (!container.classList.contains('main-header')) {
      container.classList.add('main-header');
    }

    // Injeta o HTML
    container.innerHTML = buildHTML(title, subtitle);

    // Inicializa funcionalidades
    initThemeToggle();
    initLogout();
  }

  return { init };
})();

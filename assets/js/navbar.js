/**
 * Navbar Controller — Protótipos INOVA
 * Clonado do comportamento do sau-doc-status
 * Toggle sidebar (--retracted), marcar item ativo, relógio, logout
 */

(function () {
  'use strict';

  // ─── Sidebar Toggle ──────────────────────────────────────
  function initSidebar() {
    const sidebar = document.getElementById('main-navbar');
    const toggleBtn = document.getElementById('nav-toggle');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar) return;

    // Desktop: retract/expand (usa --retracted como sau-doc-status)
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar--retracted');
        const retracted = sidebar.classList.contains('sidebar--retracted');
        toggleBtn.setAttribute('aria-expanded', !retracted);
        localStorage.setItem('sidebarCollapsed', retracted ? 'true' : 'false');
      });

      // Restaurar estado
      if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('sidebar--retracted');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    }

    // Mobile: abrir/fechar
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        const isRetracted = sidebar.classList.contains('sidebar--retracted');
        if (isRetracted) {
          sidebar.classList.remove('sidebar--retracted');
        }
        sidebar.classList.toggle('sidebar--mobile-open');
        overlay?.classList.toggle('sidebar-overlay--visible');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('sidebar--mobile-open');
        sidebar.classList.add('sidebar--retracted');
        overlay.classList.remove('sidebar-overlay--visible');
      });
    }
  }

  // ─── Marcar item ativo ───────────────────────────────────
  function markActiveLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.nav-link[data-path]');

    links.forEach(link => {
      const path = link.getAttribute('data-path');
      if (currentPath.includes(path)) {
        link.classList.add('nav-link--active');
      } else {
        link.classList.remove('nav-link--active');
      }
    });
  }

  // ─── Relógio ─────────────────────────────────────────────
  function initClock() {
    const el = document.getElementById('headerDatetime');
    if (!el) return;

    function update() {
      const now = new Date();
      const options = {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      el.textContent = now.toLocaleDateString('pt-BR', options);
    }

    update();
    setInterval(update, 30000);
  }

  // ─── Logout ──────────────────────────────────────────────
  function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      window.location.href = '/';
    });
  }

  // ─── Init ────────────────────────────────────────────────
  function init() {
    initSidebar();
    markActiveLink();
    initClock();
    initLogout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

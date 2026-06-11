/**
 * Sistema de Consentimento de Cookies — Protótipos INOVA
 * Baseado no sau-doc-status (versão standalone sem módulos ES)
 */

(function () {
  'use strict';

  // ─── Cookie Manager (simplificado) ───────────────────────
  const cookieManager = {
    set(name, value, days = 365) {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
    },
    get(name) {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    },
    remove(name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    },
    setEssentialCookie(name, value) { this.set('ess_' + name, value); },
    setFunctionalCookie(name, value) { this.set('fn_' + name, value); },
    setAnalyticsCookie(name, value) { this.set('an_' + name, value); },
    removeAllCookiesByType(type) {
      const prefix = type === 'functional' ? 'fn_' : type === 'analytics' ? 'an_' : '';
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0];
        if (name.startsWith(prefix)) this.remove(name);
      });
    }
  };

  // ─── Cookie Consent ──────────────────────────────────────
  class CookieConsent {
    constructor() {
      this.cookieConsent = null;
      this.init();
    }

    init() {
      this.cookieConsent = localStorage.getItem('cookieConsent');
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeBanner());
      } else {
        this.initializeBanner();
      }
    }

    initializeBanner() {
      // Não mostra se já consentiu
      if (this.cookieConsent) return;

      const banner = document.createElement('div');
      banner.id = 'cookie-banner';
      banner.innerHTML = `
        <div class="cookie-banner-container">
          <div class="cookie-banner-text">
            Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa
            <a href="#" class="cookie-banner-link" id="privacy-policy-link">Política de Privacidade</a>.
          </div>
          <div class="cookie-banner-buttons">
            <button id="customize-cookies" class="cookie-banner-button">
              <i class="fas fa-sliders"></i> Personalizar
            </button>
            <button id="accept-cookies" class="cookie-banner-accept">
              <i class="fas fa-check"></i> Aceitar todos
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(banner);
      this.addEventListeners();
    }

    addEventListeners() {
      const acceptButton = document.getElementById('accept-cookies');
      const customizeButton = document.getElementById('customize-cookies');
      const policyLink = document.getElementById('privacy-policy-link');

      if (acceptButton) {
        acceptButton.addEventListener('click', () => { this.acceptAll(); });
      }
      if (customizeButton) {
        customizeButton.addEventListener('click', () => { this.showCustomizeModal(); });
      }
      if (policyLink) {
        policyLink.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Política de Privacidade em desenvolvimento.');
        });
      }
    }

    acceptAll() {
      const consent = {
        essential: true,
        functional: true,
        analytics: true,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };
      localStorage.setItem('cookieConsent', JSON.stringify(consent));
      this.hideBanner();
      this.initializeCookies();
    }

    showCustomizeModal() {
      // Sem overlay/blur
      const modal = document.createElement('div');
      modal.id = 'cookie-modal';
      modal.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-overlay" style="background: transparent;">
          <div class="cookie-modal-bg rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <h2 class="text-xl font-bold text-gray-900 dark-theme:text-white"><i class="fas fa-cookie-bite modal-title__icon" aria-hidden="true" style="margin-right: 0.5rem;"></i><span>Configurações de Cookies</span></h2>
            <p class="text-sm text-gray-600 dark-theme:text-gray-300 mb-6">Personalize suas preferências de cookies. Os cookies essenciais não podem ser desativados, pois são necessários para o funcionamento do site.</p>

            <form id="cookie-preferences-form">
              <div class="space-y-6">
                <!-- Cookies Essenciais -->
                <label class="flex items-start gap-4 cursor-not-allowed py-3 px-4 rounded-lg cookie-card-disabled">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <h3 class="font-medium text-gray-900 dark-theme:text-gray-200">Cookies Essenciais</h3>
                      <span class="text-xs px-2 py-1 rounded-full bg-gray-200 dark-theme:bg-gray-600 text-gray-800 dark-theme:text-gray-100">Obrigatório</span>
                    </div>
                    <p class="text-sm text-gray-600 dark-theme:text-gray-400 mt-1">Necessários para o funcionamento básico do site</p>
                  </div>
                  <div class="flex items-center">
                    <input type="checkbox" checked disabled id="essential-cookies" name="essential-cookies" class="toggle-checkbox">
                  </div>
                </label>

                <!-- Cookies Funcionais -->
                <label class="flex items-start gap-4 cursor-pointer py-3 px-4 rounded-lg cookie-card">
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900 dark-theme:text-gray-200">Cookies Funcionais</h3>
                    <p class="text-sm text-gray-600 dark-theme:text-gray-400 mt-1">Melhoram a funcionalidade e personalização do site, como salvar suas preferências de tema e idioma</p>
                  </div>
                  <div class="flex items-center">
                    <input type="checkbox" id="functional-cookies" name="functional-cookies" class="toggle-checkbox">
                  </div>
                </label>

                <!-- Cookies Analíticos -->
                <label class="flex items-start gap-4 cursor-pointer py-3 px-4 rounded-lg cookie-card">
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900 dark-theme:text-gray-200">Cookies Analíticos</h3>
                    <p class="text-sm text-gray-600 dark-theme:text-gray-400 mt-1">Nos ajudam a entender como você usa o site, permitindo melhorar a experiência através de estatísticas anônimas</p>
                  </div>
                  <div class="flex items-center">
                    <input type="checkbox" id="analytics-cookies" name="analytics-cookies" class="toggle-checkbox">
                  </div>
                </label>
              </div>

              <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark-theme:border-gray-700">
                <button id="save-preferences" name="save-preferences" type="submit"
                  class="px-4 py-2 bg-gradient-to-r from-[#eb5224] to-[#ce1313] text-white rounded-md hover:opacity-90 transition-opacity">
                  <i class="fas fa-check"></i> Salvar Preferências
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const form = document.getElementById('cookie-preferences-form');
      const functionalCheckbox = document.getElementById('functional-cookies');
      const analyticsCheckbox = document.getElementById('analytics-cookies');
      const modalOverlay = document.getElementById('modal-overlay');

      modalOverlay?.addEventListener('click', (event) => {
        if (event.target === modalOverlay) this.hideModal();
      });

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePreferences({
          functional: functionalCheckbox?.checked || false,
          analytics: analyticsCheckbox?.checked || false,
        });
      });
    }

    savePreferences(preferences) {
      const consent = {
        essential: true,
        functional: preferences.functional,
        analytics: preferences.analytics,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };
      localStorage.setItem('cookieConsent', JSON.stringify(consent));
      this.hideModal();
      this.hideBanner();
      this.initializeCookies();

      if (!preferences.functional) cookieManager.removeAllCookiesByType('functional');
      if (!preferences.analytics) cookieManager.removeAllCookiesByType('analytics');
    }

    hideModal() {
      // Sem overlay/blur
      const modal = document.getElementById('cookie-modal');
      if (modal) modal.remove();
    }

    hideBanner() {
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.remove();
    }

    initializeCookies() {
      const consent = JSON.parse(localStorage.getItem('cookieConsent') || '{}');
      cookieManager.setEssentialCookie('theme',
        document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light');
      cookieManager.setEssentialCookie('lastAccess', new Date().toISOString());

      if (consent.functional) {
        cookieManager.setFunctionalCookie('userPreferences', JSON.stringify({
          language: 'pt-BR', notifications: 'on',
        }));
      }
      if (consent.analytics) {
        cookieManager.setAnalyticsCookie('sessionData', JSON.stringify({
          duration: 0, browser: navigator.userAgent,
          device: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop', count: 1,
        }));
      }
    }
  }

  // Inicializa automaticamente
  new CookieConsent();
})();

/**
 * Funções para a página de login
 * Sistema de autenticação com tokens assinados
 */

// Verifica se já está logado (redireciona para app)
if (typeof AuthSystem !== 'undefined' && AuthSystem.isAuthenticated()) {
  window.location.href = 'hub.html';
}

// Inicializa as funções de login quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  initThemeToggle();
  initPasswordToggle();
  initCharCounters();
  initLoginForm();
});

/**
 * Inicializa o toggle de tema claro/escuro
 */
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  
  if (!themeToggle) return;
  
  // Verifica tema salvo ou preferência do sistema
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  // Aplica estado inicial do toggle
  themeToggle.checked = isDark;
  
  // Evento de mudança de tema
  themeToggle.addEventListener('change', function() {
    const isDarkTheme = this.checked;
    
    if (isDarkTheme) {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark', 'dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
      html.classList.remove('dark', 'dark-theme');
      localStorage.setItem('theme', 'light');
    }
  });
}

/**
 * Inicializa o toggle de mostrar/ocultar senha
 */
function initPasswordToggle() {
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  
  if (!togglePasswordBtn || !passwordInput) return;
  
  togglePasswordBtn.addEventListener('click', function() {
    const isPassword = passwordInput.type === 'password';
    const newType = isPassword ? 'text' : 'password';
    
    passwordInput.type = newType;
    
    // Atualiza o ícone
    if (newType === 'text') {
      togglePasswordBtn.src = 'assets/icons/login-eye-open.svg';
      togglePasswordBtn.alt = 'Ocultar senha';
      togglePasswordBtn.title = 'Ocultar senha';
    } else {
      togglePasswordBtn.src = 'assets/icons/login-eye-closed.svg';
      togglePasswordBtn.alt = 'Mostrar senha';
      togglePasswordBtn.title = 'Mostrar senha';
    }
    
    // Atualiza estado ARIA
    togglePasswordBtn.setAttribute('aria-pressed', newType === 'text' ? 'true' : 'false');
    togglePasswordBtn.setAttribute('aria-label', newType === 'text' ? 'Ocultar senha' : 'Exibir senha');
  });
}

/**
 * Atualiza o contador de caracteres
 */
function updateCharCounter(input, counterElement, maxLength) {
  if (!input || !counterElement) return;
  
  const currentLength = input.value.length;
  const remaining = maxLength - currentLength;
  
  counterElement.textContent = `${currentLength}/${maxLength}`;
  counterElement.setAttribute('aria-live', 'polite');
  
  // Remove classes anteriores
  counterElement.classList.remove('text-gray-500', 'text-yellow-500', 'text-red-500', 'font-medium', 'warning', 'danger');
  
  // Aplica novas classes com base no comprimento
  if (currentLength === 0) {
    counterElement.classList.add('text-gray-500');
  } else if (remaining <= 0) {
    counterElement.classList.add('text-red-500', 'font-medium', 'danger');
    counterElement.setAttribute('aria-invalid', 'true');
  } else if (remaining <= maxLength * 0.2) {
    counterElement.classList.add('text-yellow-500', 'font-medium', 'warning');
    counterElement.setAttribute('aria-invalid', 'false');
  } else {
    counterElement.classList.add('text-gray-500');
    counterElement.setAttribute('aria-invalid', 'false');
  }
  
  // Atualiza estado do campo
  input.setAttribute('aria-invalid', remaining < 0 ? 'true' : 'false');
}

/**
 * Configura os contadores de caracteres
 */
function initCharCounters() {
  setupInputWithCounter('user', 'userCounter', 40);
  setupInputWithCounter('password', 'passwordCounter', 10);
}

/**
 * Configura input com contador
 */
function setupInputWithCounter(inputId, counterId, maxLength) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  
  if (!input || !counter) return;
  
  // Inicializa contador
  updateCharCounter(input, counter, maxLength);
  
  // Adiciona listener de input
  input.addEventListener('input', function() {
    updateCharCounter(input, counter, maxLength);
  });
}

/**
 * Inicializa o formulário de login
 */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const loginButton = document.getElementById('loginButton');
  
  if (!loginForm) return;
  
  // Animação inicial do botão
  if (loginButton) {
    setTimeout(() => {
      loginButton.classList.add('opacity-100');
      loginButton.classList.remove('opacity-0');
    }, 100);
  }
  
  // Handler de submit
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // ── DEV MODE: pula autenticação e vai direto para o hub ──
    const DEV_MODE = true;
    if (DEV_MODE) {
      const btn = loginForm.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Entrando...';
      }
      setTimeout(() => { window.location.href = 'hub.html'; }, 500);
      return;
    }
    // ── FIM DEV MODE ──
    
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const userInput = document.getElementById('user');
    const passwordInput = document.getElementById('password');
    
    // Remove mensagens de erro anteriores
    const existingError = loginForm.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    // Validação básica
    if (!userInput.value.trim() || !passwordInput.value.trim()) {
      showErrorMessage(loginForm, 'Por favor, preencha todos os campos.');
      return;
    }
    
    // Desabilita botão durante o envio
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add('opacity-75', 'cursor-not-allowed');
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Entrando...';
    }
    
    try {
      // Simulação de autenticação (substituir por chamada real)
      await simulateLogin(userInput.value, passwordInput.value);
      
      // Redireciona para a página principal em caso de sucesso
      window.location.href = 'hub.html';
      
    } catch (error) {
      // Mostra mensagem de erro
      showErrorMessage(loginForm, error.message || 'Erro ao fazer login. Tente novamente.');
      
      // Reativa botão
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
        submitButton.setAttribute('aria-busy', 'false');
        submitButton.innerHTML = 'Entrar';
      }
    }
  });
}

/**
 * Mostra mensagem de erro no formulário
 */
function showErrorMessage(form, message) {
  // Remove erro anterior
  const existingError = form.querySelector('.error-message');
  if (existingError) existingError.remove();
  
  // Cria elemento de erro
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  errorMessage.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
    </svg>
    ${message}
  `;
  
  // Insere antes do botão de submit
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton && submitButton.parentElement) {
    submitButton.parentElement.insertAdjacentElement('beforebegin', errorMessage);
  } else {
    form.appendChild(errorMessage);
  }
}

/**
 * Valida login usando o sistema de autenticação seguro
 */
function simulateLogin(user, password) {
  return new Promise((resolve, reject) => {
    // Simula delay de rede
    setTimeout(() => {
      // Usa o sistema de autenticação com tokens
      if (typeof AuthSystem !== 'undefined') {
        const result = AuthSystem.login(user, password);
        if (result.success) {
          // Mantém compatibilidade com código legado
          sessionStorage.setItem('isLoggedIn', 'true');
          sessionStorage.setItem('user', user);
          resolve({ success: true, user });
        } else {
          reject(new Error(result.error || 'Usuário ou senha incorretos.'));
        }
      } else {
        reject(new Error('Sistema de autenticação não disponível.'));
      }
    }, 800);
  });
}

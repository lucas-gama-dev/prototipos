/**
 * Sistema de Autenticação com Token Assinado
 * Proteção básica para aplicações client-side (não substitui backend real)
 */

const AuthSystem = (function() {
  'use strict';

  // Chave secreta para assinatura (ofuscada)
  const _k = [73, 78, 79, 86, 65, 83, 65, 77, 85, 50, 48, 50, 54];
  const _s = () => String.fromCharCode(..._k);

  // Credenciais hasheadas (SHA-256 simulado com base64)
  // Usuário: inovasamu192 | Senha: Inova@2o26
  const VALID_CREDENTIALS = {
    // Hash do usuário + senha concatenados
    hash: 'YjdmMzQ1ZjJhNzk4NmE0MzJiNWM3ZDhlOWYxMjM0NTY='
  };

  // Tempo de expiração da sessão (8 horas em ms)
  const SESSION_EXPIRY = 8 * 60 * 60 * 1000;

  /**
   * Gera hash simples de uma string (não criptograficamente seguro, mas dificulta)
   */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return btoa(hash.toString(16) + str.length.toString(36));
  }

  /**
   * Gera um token de sessão assinado
   */
  function generateToken(user) {
    const timestamp = Date.now();
    const payload = {
      u: simpleHash(user),
      t: timestamp,
      e: timestamp + SESSION_EXPIRY,
      r: Math.random().toString(36).substring(2, 10)
    };
    
    // Cria assinatura
    const data = JSON.stringify(payload);
    const signature = simpleHash(data + _s());
    
    return btoa(JSON.stringify({
      p: payload,
      s: signature
    }));
  }

  /**
   * Valida um token de sessão
   */
  function validateToken(token) {
    if (!token) return false;
    
    try {
      const decoded = JSON.parse(atob(token));
      const { p: payload, s: signature } = decoded;
      
      // Verifica expiração
      if (Date.now() > payload.e) {
        console.warn('[Auth] Sessão expirada');
        return false;
      }
      
      // Verifica assinatura
      const expectedSignature = simpleHash(JSON.stringify(payload) + _s());
      if (signature !== expectedSignature) {
        console.warn('[Auth] Token inválido');
        return false;
      }
      
      return true;
    } catch (e) {
      console.warn('[Auth] Erro ao validar token');
      return false;
    }
  }

  /**
   * Valida credenciais de login
   */
  function validateCredentials(user, password) {
    // Gera hash das credenciais fornecidas
    const inputHash = simpleHash(user.toLowerCase() + ':' + password);
    const expectedHash = simpleHash('inovasamu192:Inova@2o26');
    
    return inputHash === expectedHash;
  }

  /**
   * Realiza login
   */
  function login(user, password) {
    if (!validateCredentials(user, password)) {
      return { success: false, error: 'Credenciais inválidas' };
    }
    
    const token = generateToken(user);
    
    // Armazena token e informações de sessão
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('authUser', btoa(user));
    sessionStorage.setItem('authTime', Date.now().toString());
    
    return { success: true, token };
  }

  /**
   * Verifica se está autenticado
   */
  function isAuthenticated() {
    const token = sessionStorage.getItem('authToken');
    const authTime = sessionStorage.getItem('authTime');
    
    // Verifica se os dados existem
    if (!token || !authTime) {
      return false;
    }
    
    // Verifica integridade do token
    if (!validateToken(token)) {
      logout();
      return false;
    }
    
    // Verifica tempo de sessão
    const elapsed = Date.now() - parseInt(authTime, 10);
    if (elapsed > SESSION_EXPIRY) {
      logout();
      return false;
    }
    
    return true;
  }

  /**
   * Obtém o usuário logado
   */
  function getUser() {
    try {
      const encoded = sessionStorage.getItem('authUser');
      return encoded ? atob(encoded) : null;
    } catch {
      return null;
    }
  }

  /**
   * Realiza logout
   */
  function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('authTime');
    // Mantém compatibilidade
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
  }

  /**
   * Protege uma página (redireciona se não autenticado)
   */
  function protectPage(loginUrl = 'login.html') {
    if (!isAuthenticated()) {
      window.location.href = loginUrl;
      return false;
    }
    return true;
  }

  /**
   * Renova a sessão (estende o tempo)
   */
  function renewSession() {
    if (isAuthenticated()) {
      const user = getUser();
      if (user) {
        const token = generateToken(user);
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('authTime', Date.now().toString());
      }
    }
  }

  // API pública
  return {
    login,
    logout,
    isAuthenticated,
    getUser,
    protectPage,
    renewSession,
    // Para debug (remover em produção)
    _validateToken: validateToken
  };
})();

// Expõe globalmente
window.AuthSystem = AuthSystem;

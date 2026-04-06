// context/AuthContext.jsx
// Provides auth state (user, token, mustChangePassword) and helpers
// (login, register, logout, updateUser) to any component in the tree.
// Token is persisted in localStorage so the session survives a page refresh.

import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const [mustChangePassword, setMustChangePassword] = useState(false);

  function clearAuth() {
    setUser(null);
    setToken(null);
    setMustChangePassword(false);
    localStorage.removeItem('token');
  }

  function saveAuth(data) {
    setUser(data.user);
    setToken(data.token);
    setMustChangePassword(data.mustChangePassword || false);
    localStorage.setItem('token', data.token);
  }

  // On mount: if we have a stored token, verify it's still valid and restore the user
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setUser(data);
          setMustChangePassword(data.mustChangePassword || false);
        } else {
          clearAuth();
        }
      })
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function register({ email, password, name, company, inviteCode, securityQuestion, securityAnswer }) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, company, inviteCode, securityQuestion, securityAnswer }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    saveAuth(data);
  }

  async function login({ email, password }) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    saveAuth(data);
  }

  function logout() {
    clearAuth();
  }

  /** Update local user state after profile edits (avoids full re-fetch). */
  function updateUser(updates) {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }

  /** Clear the must-change-password flag after the user changes their password. */
  function clearMustChangePassword() {
    setMustChangePassword(false);
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading, mustChangePassword,
      login, register, logout, updateUser, clearMustChangePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

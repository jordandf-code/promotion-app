// context/AuthContext.jsx
// Provides auth state (user, token) and helpers (login, register, logout)
// to any component in the tree. Token is persisted in localStorage so the
// session survives a page refresh.

import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  function clearAuth() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }

  function saveAuth(data) {
    setUser(data.user);
    setToken(data.token);
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
        if (data) setUser(data);
        else clearAuth();
      })
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function register({ email, password, name, role, company }) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, company }),
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

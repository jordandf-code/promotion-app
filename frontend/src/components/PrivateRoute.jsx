// components/PrivateRoute.jsx
// Wraps a route that requires the user to be logged in.
// While auth state is being restored from localStorage, renders nothing
// (avoids a flash-of-login-page on refresh). Once resolved, redirects to
// /login if not authenticated.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

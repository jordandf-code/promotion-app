// components/RoleGuard.jsx
// Blocks access to a route if the user's role is not in the allowed list.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleGuard({ allowed, children }) {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

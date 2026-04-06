import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { AdminDataProvider } from './hooks/useAdminData.js';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scorecard from './pages/Scorecard';
import Goals from './pages/Goals';
import People from './pages/People';
import Wins from './pages/Wins';
import ActionItems from './pages/ActionItems';
import MyStory from './pages/MyStory';
import Admin from './pages/Admin';
import Sharing from './pages/Sharing';
import Calendar from './pages/Calendar';
import Pursuits from './pages/Pursuits';
import PublicSummary from './pages/PublicSummary';
import FeedbackForm from './pages/FeedbackForm';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
      <AdminDataProvider>
      <SettingsProvider>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/share/:token"    element={<PublicSummary />} />
          <Route path="/feedback/:token" element={<FeedbackForm />} />

          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated shell — all tab pages live here */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index             element={<Dashboard />} />
            <Route path="scorecard"  element={<Scorecard />} />
            <Route path="goals"      element={<Goals />} />
            <Route path="people"     element={<People />} />
            <Route path="wins"       element={<Wins />} />
            <Route path="actions"    element={<ActionItems />} />
            <Route path="story"      element={<MyStory />} />
            <Route path="sharing"    element={<Sharing />} />
            <Route path="calendar"   element={<Calendar />} />
            <Route path="pursuits"   element={<Pursuits />} />
            <Route path="admin"      element={<Admin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SettingsProvider>
      </AdminDataProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

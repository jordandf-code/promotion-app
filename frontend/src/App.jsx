// App.jsx — Main router setup with all page routes, auth context, and layout wrapper
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { AdminDataProvider } from './hooks/useAdminData.js';
import PrivateRoute from './components/PrivateRoute';
import RoleGuard from './components/RoleGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
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
import Learning from './pages/Learning';
import Eminence from './pages/Eminence';
import SuperAdmin from './pages/SuperAdmin';
import ViewOthers from './pages/ViewOthers';
import PublicSummary from './pages/PublicSummary';
import FeedbackForm from './pages/FeedbackForm';
import InfluenceMap from './pages/InfluenceMap';
import BrandWorkspace from './pages/BrandWorkspace';
import Sponsees from './pages/Sponsees';
import MockPanel from './pages/MockPanel';
import DocumentVault from './pages/DocumentVault';
import ImportExport from './pages/ImportExport';
import Reflections from './pages/Reflections';
import Competencies from './pages/Competencies';
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

          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Authenticated shell — all tab pages live here */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index             element={<RoleGuard allowed={['superuser','user']}><Dashboard /></RoleGuard>} />
            <Route path="scorecard"  element={<RoleGuard allowed={['superuser','user']}><Scorecard /></RoleGuard>} />
            <Route path="goals"      element={<RoleGuard allowed={['superuser','user']}><Goals /></RoleGuard>} />
            <Route path="people"     element={<RoleGuard allowed={['superuser','user']}><People /></RoleGuard>} />
            <Route path="wins"       element={<RoleGuard allowed={['superuser','user']}><Wins /></RoleGuard>} />
            <Route path="actions"    element={<RoleGuard allowed={['superuser','user']}><ActionItems /></RoleGuard>} />
            <Route path="story"      element={<RoleGuard allowed={['superuser','user']}><MyStory /></RoleGuard>} />
            <Route path="sharing"    element={<RoleGuard allowed={['superuser','user']}><Sharing /></RoleGuard>} />
            <Route path="calendar"   element={<RoleGuard allowed={['superuser','user']}><Calendar /></RoleGuard>} />
            <Route path="opportunities" element={<RoleGuard allowed={['superuser','user']}><Pursuits /></RoleGuard>} />
            <Route path="learning"   element={<RoleGuard allowed={['superuser','user']}><Learning /></RoleGuard>} />
            <Route path="eminence"   element={<RoleGuard allowed={['superuser','user']}><Eminence /></RoleGuard>} />
            <Route path="influence-map" element={<RoleGuard allowed={['superuser','user']}><InfluenceMap /></RoleGuard>} />
            <Route path="brand"      element={<RoleGuard allowed={['superuser','user']}><BrandWorkspace /></RoleGuard>} />
            <Route path="sponsees"   element={<RoleGuard allowed={['superuser','user']}><Sponsees /></RoleGuard>} />
            <Route path="mock-panel" element={<RoleGuard allowed={['superuser','user']}><MockPanel /></RoleGuard>} />
            <Route path="vault"      element={<RoleGuard allowed={['superuser','user']}><DocumentVault /></RoleGuard>} />
            <Route path="reflections"   element={<RoleGuard allowed={['superuser','user']}><Reflections /></RoleGuard>} />
            <Route path="competencies" element={<RoleGuard allowed={['superuser','user']}><Competencies /></RoleGuard>} />
            <Route path="import-export" element={<RoleGuard allowed={['superuser','user']}><ImportExport /></RoleGuard>} />
            <Route path="admin"      element={<Admin />} />
            <Route path="view-others" element={<ViewOthers />} />
            <Route path="super-admin" element={<RoleGuard allowed={['superuser']}><SuperAdmin /></RoleGuard>} />
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

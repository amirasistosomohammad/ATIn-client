import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ForgotPassword from './pages/public/ForgotPassword'
import ResetPassword from './pages/public/ResetPassword'
import Layout from './layout/Layout'
import Dashboard from './pages/Dashboard'
import TrackByControlNumber from './pages/TrackByControlNumber'
import MyDocuments from './pages/MyDocuments'
import RegisterControlNumber from './pages/RegisterControlNumber'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import UserManagement from './pages/admin/UserManagement'
import DocumentTypes from './pages/admin/DocumentTypes'
import Settings from './pages/admin/Settings'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/" state={{ from: { pathname: location.pathname } }} replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="track" element={<TrackByControlNumber />} />
        <Route path="documents" element={<MyDocuments />} />
        <Route path="documents/register" element={<RegisterControlNumber />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin/users" element={<UserManagement />} />
        <Route path="admin/document-types" element={<DocumentTypes />} />
        <Route path="admin/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <ToastContainer position="top-right" autoClose={3000} />
          <AppRoutes />
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

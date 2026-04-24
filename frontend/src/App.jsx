import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider }         from './context/ToastContext'
import LoginPage   from './pages/LoginPage'
import CashierPage from './pages/CashierPage'
import BaristaPage from './pages/BaristaPage'
import ManagerPage from './pages/ManagerPage'

function roleAllowed(userRole, allowed) {
  const u = String(userRole || '').trim().toLowerCase()
  return allowed.some(r => String(r).trim().toLowerCase() === u)
}

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roleAllowed(user.role, roles)) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const map = { Cashier: '/cashier', Barista: '/barista', Manager: '/manager' }
  return <Navigate to={map[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/"      element={<RoleRedirect />} />
            <Route path="/cashier" element={
              <ProtectedRoute roles={['Cashier']}><CashierPage /></ProtectedRoute>
            } />
            <Route path="/barista" element={
              <ProtectedRoute roles={['Barista']}><BaristaPage /></ProtectedRoute>
            } />
            <Route path="/manager" element={
              <ProtectedRoute roles={['Manager']}><ManagerPage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

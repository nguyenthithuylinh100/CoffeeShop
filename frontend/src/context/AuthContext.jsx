import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

/** Chuẩn hoá role từ DB/API (barista, BARISTA, …) → Cashier | Barista | Manager */
const ROLE_CANON = {
  cashier: 'Cashier',
  barista: 'Barista',
  manager: 'Manager',
}

function canonicalRole(role) {
  if (role == null || role === '') return ''
  const key = String(role).trim().toLowerCase()
  return ROLE_CANON[key] || String(role).trim()
}

function normalizeUser(emp) {
  if (!emp || typeof emp !== 'object') return null
  return { ...emp, role: canonicalRole(emp.role) }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('user')
      if (!stored) return null
      return normalizeUser(JSON.parse(stored))
    } catch {
      return null
    }
  })

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { token, employee } = res.data
    const normalized = normalizeUser(employee)
    // Store token in sessionStorage (cleared on tab close)
    sessionStorage.setItem('token', token)
    sessionStorage.setItem('user', JSON.stringify(normalized))
    setUser(normalized)
    return normalized
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

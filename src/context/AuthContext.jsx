import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const initFromStorage = useCallback(() => {
    const stored = authService.getStoredUser()
    if (stored) {
      setUser(stored.user)
      setToken(stored.token)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    const u = data.user ?? data
    const t = data.token ?? data.access_token
    authService.setStoredUser(u, t)
    setUser(u)
    setToken(t)
    return { success: true, user: u }
  }, [])

  const register = useCallback(async (formData) => {
    const data = await authService.register(formData)
    return { success: true, message: data.message }
  }, [])

  const verifyEmail = useCallback(async (email, otp) => {
    const data = await authService.verifyEmail(email, otp)
    return { success: true, ...data }
  }, [])

  const resendOtp = useCallback(async (email) => {
    await authService.resendOtp(email)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setToken(null)
  }, [])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    register,
    verifyEmail,
    resendOtp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

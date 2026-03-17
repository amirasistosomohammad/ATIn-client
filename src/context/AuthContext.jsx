import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const initFromStorage = useCallback(async () => {
    const stored = authService.getStoredUser()
    if (!stored?.token) {
      setLoading(false)
      return
    }
    try {
      const userData = await authService.getUser()
      if (userData) {
        setUser(userData)
        setToken(stored.token)
        authService.setStoredUser(userData, stored.token)
      } else {
        authService.logout()
        setUser(null)
        setToken(null)
      }
    } catch {
      authService.logout()
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    const u = data.user ?? data
    const t = data.token ?? data.access_token

    // If the account is deactivated, do not log the user in.
    if (u && u.is_active === false) {
      const err = new Error(
        u.deactivation_message ||
          u.status_message ||
          'Your account is currently deactivated. Please contact the system administrator.'
      )
      err.code = 'ACCOUNT_INACTIVE'
      err.user = u
      err.remarks =
        u.deactivation_remarks || u.last_admin_remarks || u.remarks || null
      throw err
    }

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

  const forgotPassword = useCallback(async (email) => {
    return authService.forgotPassword(email)
  }, [])

  const resetPassword = useCallback(async (payload) => {
    return authService.resetPassword(payload)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setToken(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const userData = await authService.getUser()
    if (!userData || userData.is_active === false) {
      await authService.logout()
      setUser(null)
      setToken(null)
      return null
    }

    setUser(userData)
    const stored = authService.getStoredUser()
    if (stored?.token) authService.setStoredUser(userData, stored.token)
    return userData
  }, [])

  // Periodically re-validate the current user so that if an admin deactivates
  // or deletes the account from another session, this UI will log out and
  // return to the login page automatically on the next check.
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) {
        refreshUser().catch(() => {
          // any error is handled inside refreshUser via logout
        })
      }
    }, 5000) // check every 5 seconds so deactivated users are logged out quickly

    return () => clearInterval(interval)
  }, [token, refreshUser])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    refreshUser,
    register,
    verifyEmail,
    resendOtp,
    forgotPassword,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

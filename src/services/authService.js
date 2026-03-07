const API_BASE = import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'

export const authService = {
  async login(usernameOrEmail, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: usernameOrEmail, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Login failed')
    }
    return res.json()
  },

  async register(payload) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(data.message || 'Registration failed')
      e.data = data
      throw e
    }
    return data
  },

  async verifyEmail(email, otp) {
    const res = await fetch(`${API_BASE}/email/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(data.message || 'Verification failed')
      e.data = data
      throw e
    }
    return { success: true, ...data }
  },

  async resendOtp(email) {
    const res = await fetch(`${API_BASE}/email/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(data.message || 'Resend failed')
      e.data = data
      throw e
    }
    return data
  },

  logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  },

  getStoredUser() {
    try {
      const user = localStorage.getItem('user')
      const token = localStorage.getItem('token')
      if (user && token) return { user: JSON.parse(user), token }
    } catch (_) {}
    return null
  },

  setStoredUser(user, token) {
    localStorage.setItem('user', JSON.stringify(user))
    if (token) localStorage.setItem('token', token)
  },
}

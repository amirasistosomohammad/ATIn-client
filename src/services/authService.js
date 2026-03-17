const API_BASE = import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'

function getAuthHeaders() {
  const stored = authService.getStoredUser()
  if (!stored?.token) return {}
  return { Authorization: `Bearer ${stored.token}` }
}

export const authService = {
  getAuthHeaders,

  async login(usernameOrEmail, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: usernameOrEmail, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.message || 'Login failed')
      // surface backend payload so UI can react to inactive/deactivated status
      err.data = data
      err.code = data.code || data.status || null
      if (data.user) err.user = data.user
      // always pass through deactivation_remarks so login page can show admin remarks
      err.remarks = data.deactivation_remarks !== undefined ? data.deactivation_remarks : (err.remarks ?? null)
      throw err
    }
    return data
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

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(data.message || 'Request failed')
      e.data = data
      throw e
    }
    return data
  },

  async resetPassword({ email, token, password, password_confirmation }) {
    const res = await fetch(`${API_BASE}/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, token, password, password_confirmation }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(data.message || (data.errors?.token?.[0]) || (data.errors?.password?.[0]) || 'Reset failed')
      e.data = data
      throw e
    }
    return data
  },

  async logout() {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getAuthHeaders(),
          },
        })
      } catch (_) {}
    }
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  },

  async getUser() {
    const res = await fetch(`${API_BASE}/user`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.user ?? data
  },

  /** List users (admin only). For accountability report dropdown. */
  async getUsers(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/users?${q}`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    })
    if (!res.ok) throw new Error('Failed to load users')
    const data = await res.json()
    return data.data ?? []
  },

  /** Update user (admin only). */
  async updateUser(userId, payload) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to update user')
    return data
  },

  /** Delete user (admin only). */
  async deleteUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to delete user')
    return data
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

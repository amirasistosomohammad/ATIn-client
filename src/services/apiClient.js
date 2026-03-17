const API_BASE = import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'

/** Base URL for storage (logo, etc.) – API origin without /api so relative paths resolve to the backend. */
export function getStorageOrigin() {
  const base = typeof API_BASE === 'string' && API_BASE ? API_BASE.replace(/\/api\/?$/i, '') : ''
  return base || (typeof window !== 'undefined' ? window.location.origin : '')
}

export function normalizeLogoUrl(url) {
  if (url == null || url === '') return null
  let u = String(url).trim()
  u = u.replace(/^http:\/\/https?\/\//i, 'https://')
  u = u.replace(/^https\/\//i, 'https://')
  if (u.startsWith('http://') && typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    u = 'https://' + u.slice(7)
  }
  if (u.startsWith('/')) {
    u = getStorageOrigin() + u
  }
  return u || null
}

export function getAuthToken() {
  return localStorage.getItem('token')
}

export async function apiRequest(path, { method = 'GET', body, auth = false, cache = 'default' } = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers = { Accept: 'application/json' }

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache,
    })
  } catch (err) {
    const msg =
      err?.message === 'Failed to fetch'
        ? 'Could not reach the server. Make sure Laravel is running and VITE_LARAVEL_API is correct.'
        : err?.message || 'Network error'
    const e = new Error(msg)
    e.cause = err
    throw e
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    const e = new Error(data?.message || 'Request failed')
    e.status = res.status
    e.data = data
    throw e
  }

  return data
}

export async function apiRequestFormData(path, { method = 'POST', formData, auth = false } = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers = { Accept: 'application/json' }

  if (auth) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: formData,
    })
  } catch (err) {
    const msg =
      err?.message === 'Failed to fetch'
        ? 'Could not reach the server. Make sure Laravel is running and VITE_LARAVEL_API is correct.'
        : err?.message || 'Network error'
    const e = new Error(msg)
    e.cause = err
    throw e
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    const e = new Error(data?.message || 'Request failed')
    e.status = res.status
    e.data = data
    throw e
  }

  return data
}


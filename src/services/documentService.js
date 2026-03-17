import { authService } from './authService'

const API_BASE = import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'

function getAuthHeaders() {
  return authService.getAuthHeaders()
}

export const documentService = {
  async getDocumentTypes() {
    const res = await fetch(`${API_BASE}/document-types`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to load document types')
    return res.json()
  },

  async getDocuments(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/documents?${q}`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to load documents')
    return res.json()
  },

  async getDocumentById(id) {
    const res = await fetch(`${API_BASE}/documents/${id}`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Document not found')
    return res.json()
  },

  async getDocumentByControlNumber(controlNumber) {
    const res = await fetch(
      `${API_BASE}/documents/by-control-number/${encodeURIComponent(controlNumber)}`,
      { headers: getAuthHeaders() }
    )
    if (!res.ok) throw new Error('Document not found')
    return res.json()
  },

  async registerDocument(data) {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message || 'Failed to register document')
    return json
  },

  async recordIn(documentId, body = {}) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message || 'Failed to record In')
    return json
  },

  async recordOut(documentId, body = {}) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message || 'Failed to record Out')
    return json
  },

  async getReportTracking(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/reports/tracking?${q}`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to load report')
    return res.json()
  },

  async getReportDocumentHistory(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/reports/document-history?${q}`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to load report')
    return res.json()
  },

  async getReportAccountability(params) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/reports/accountability?${q}`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to load report')
    return res.json()
  },

  reportTrackingCsvUrl(params = {}) {
    const q = new URLSearchParams({ ...params, format: 'csv' }).toString()
    return `${API_BASE}/reports/tracking?${q}`
  },

  reportDocumentHistoryCsvUrl(params = {}) {
    const q = new URLSearchParams({ ...params, format: 'csv' }).toString()
    return `${API_BASE}/reports/document-history?${q}`
  },

  reportAccountabilityCsvUrl(params) {
    const q = new URLSearchParams({ ...params, format: 'csv' }).toString()
    return `${API_BASE}/reports/accountability?${q}`
  },

  // Admin-only: document type management
  async getDocumentTypesAll() {
    const res = await fetch(`${API_BASE}/admin/document-types`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to load document types')
    const data = await res.json()
    return data.data ?? []
  },
  async createDocumentType(payload) {
    const res = await fetch(`${API_BASE}/admin/document-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to create document type')
    return data
  },
  async updateDocumentType(id, payload) {
    const res = await fetch(`${API_BASE}/admin/document-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to update document type')
    return data
  },
}

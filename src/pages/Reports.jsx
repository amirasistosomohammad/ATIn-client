import React, { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { documentService } from '../services/documentService'
import { authService } from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../services/notificationService'
import Portal from '../components/Portal.jsx'

const API_BASE = import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'

function parseErrorMessage(text) {
  try {
    const j = JSON.parse(text)
    return j.message || null
  } catch {
    return null
  }
}

function downloadReport(path, params, filename, format = 'csv') {
  const q = new URLSearchParams({ ...params, format }).toString()
  const url = `${API_BASE}${path}?${q}`
  const token = authService.getStoredUser()?.token
  const link = document.createElement('a')
  link.style.display = 'none'
  document.body.appendChild(link)
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      const contentType = r.headers.get('Content-Type') || ''
      if (!r.ok) {
        return r.text().then((text) => {
          throw new Error(parseErrorMessage(text) || 'Export failed.')
        })
      }
      if (format === 'pdf' && !contentType.includes('application/pdf')) {
        return r.text().then((text) => {
          throw new Error(parseErrorMessage(text) || 'PDF export is not available.')
        })
      }
      return r.blob()
    })
    .then((blob) => {
      const u = URL.createObjectURL(blob)
      link.href = u
      link.download = filename
      link.click()
      URL.revokeObjectURL(u)
    })
    .catch((err) => {
      showToast.error(err?.message || 'Download failed.')
    })
    .finally(() => document.body.removeChild(link))
}

export default function Reports() {
  const { user } = useAuth()
  const [tracking, setTracking] = useState({ data: [] })
  const [trackingLoading, setTrackingLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', status: '', document_type_id: '' })
  const [appliedFilters, setAppliedFilters] = useState({ date_from: '', date_to: '', status: '', document_type_id: '' })
  const [reportTab, setReportTab] = useState('tracking')

  const [docHistory, setDocHistory] = useState({ data: [] })
  const [docHistoryLoading, setDocHistoryLoading] = useState(false)
  const [docHistoryAllLoaded, setDocHistoryAllLoaded] = useState(false)
  const [docHistoryFilters, setDocHistoryFilters] = useState({
    control_number: '',
    date_from: '',
    date_to: '',
  })
  const [docHistoryAppliedFilters, setDocHistoryAppliedFilters] = useState({
    control_number: '',
    date_from: '',
    date_to: '',
  })

  const [accountability, setAccountability] = useState({ data: [] })
  const [accLoading, setAccLoading] = useState(false)
  const [accAllLoaded, setAccAllLoaded] = useState(false)
  const [accFilters, setAccFilters] = useState({ user_id: '', date_from: '', date_to: '' })
  const [accAppliedFilters, setAccAppliedFilters] = useState({ user_id: '', date_from: '', date_to: '' })
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [summaryClosing, setSummaryClosing] = useState(false)

  const statusLabel = (status) => {
    if (status === 'in_transit') return 'Released'
    if (status === 'with_personnel') return 'Received'
    return status
  }

  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Load all report data and users once when Reports is opened (one-time load).
  useEffect(() => {
    let cancelled = false
    setTrackingLoading(true)
    setDocHistoryLoading(true)
    setAccLoading(true)
    setUsersLoading(true)

    async function loadAll() {
      try {
        const [trackingRes, docHistoryRes, accRes, usersData] = await Promise.all([
          documentService.getReportTracking({}),
          documentService.getReportDocumentHistory({}),
          documentService.getReportAccountability({}),
          authService.getUsers().catch(() => []),
        ])
        if (cancelled) return
        setTracking(trackingRes)
        setDocHistory(docHistoryRes)
        setAccountability(accRes)
        setDocHistoryAllLoaded(true)
        setAccAllLoaded(true)
        const list = Array.isArray(usersData) ? usersData : (usersData?.data ?? [])
        setUsers(list)
      } catch {
        if (!cancelled) {
          setTracking({ data: [] })
          setDocHistory({ data: [] })
          setAccountability({ data: [] })
          setDocHistoryAllLoaded(true)
          setAccAllLoaded(true)
          setUsers([])
        }
      } finally {
        if (!cancelled) {
          setTrackingLoading(false)
          setDocHistoryLoading(false)
          setAccLoading(false)
          setUsersLoading(false)
        }
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const anyLoading = trackingLoading || docHistoryLoading || accLoading
    setLoading(anyLoading)
    if (!anyLoading) {
      const id = requestAnimationFrame(() => setShowContent(true))
      return () => cancelAnimationFrame(id)
    }
    setShowContent(false)
  }, [trackingLoading, docHistoryLoading, accLoading])

  const initialTrackingFilters = { date_from: '', date_to: '', status: '', document_type_id: '' }
  const refreshTracking = useCallback(async () => {
    setTrackingLoading(true)
    try {
      const res = await documentService.getReportTracking({})
      setTracking(res)
    } catch {
      setTracking({ data: [] })
    } finally {
      setTrackingLoading(false)
    }
  }, [])
  const resetTrackingFilters = useCallback(() => {
    setFilters(initialTrackingFilters)
    setAppliedFilters(initialTrackingFilters)
  }, [])

  // Document history: load all once; filters are client-side and optional.
  const canRunDocHistory = true

  const refreshDocumentHistory = useCallback(async () => {
    setDocHistoryLoading(true)
    try {
      const res = await documentService.getReportDocumentHistory({})
      setDocHistory(res)
      setDocHistoryAllLoaded(true)
    } catch {
      setDocHistory({ data: [] })
      setDocHistoryAllLoaded(true)
    } finally {
      setDocHistoryLoading(false)
    }
  }, [])
  const resetDocHistoryFilters = useCallback(() => {
    const empty = { control_number: '', date_from: '', date_to: '' }
    setDocHistoryFilters(empty)
    setDocHistoryAppliedFilters(empty)
  }, [])

  const runDocumentHistory = useCallback(async () => {
    if (!canRunDocHistory) return
    if (!docHistoryAllLoaded) {
      setDocHistoryLoading(true)
      try {
        const res = await documentService.getReportDocumentHistory({})
        setDocHistory(res)
        setDocHistoryAllLoaded(true)
      } catch {
        setDocHistory({ data: [] })
        setDocHistoryAllLoaded(true)
      } finally {
        setDocHistoryLoading(false)
      }
    }
    setDocHistoryAppliedFilters(docHistoryFilters)
  }, [canRunDocHistory, docHistoryAllLoaded, docHistoryFilters])

  // Accountability: load all once; filters are client-side and optional.
  const canRunAccountability = true

  const refreshAccountability = useCallback(async () => {
    setAccLoading(true)
    try {
      const res = await documentService.getReportAccountability({})
      setAccountability(res)
      setAccAllLoaded(true)
    } catch {
      setAccountability({ data: [] })
      setAccAllLoaded(true)
    } finally {
      setAccLoading(false)
    }
  }, [])
  const resetAccFilters = useCallback(() => {
    const empty = { user_id: '', date_from: '', date_to: '' }
    setAccFilters(empty)
    setAccAppliedFilters(empty)
  }, [])

  const runAccountability = useCallback(async () => {
    if (!canRunAccountability) return
    if (!accAllLoaded) {
      setAccLoading(true)
      try {
        const res = await documentService.getReportAccountability({})
        setAccountability(res)
        setAccAllLoaded(true)
      } catch {
        setAccountability({ data: [] })
        setAccAllLoaded(true)
      } finally {
        setAccLoading(false)
      }
    }
    setAccAppliedFilters(accFilters)
  }, [canRunAccountability, accAllLoaded, accFilters])

  const trackingExportParams = () => ({
    ...(appliedFilters.date_from && { date_from: appliedFilters.date_from }),
    ...(appliedFilters.date_to && { date_to: appliedFilters.date_to }),
    ...(appliedFilters.status && { status: appliedFilters.status }),
    ...(appliedFilters.document_type_id && { document_type_id: appliedFilters.document_type_id }),
  })
  const docHistoryExportParams = () => {
    const params = {}
    if (docHistoryAppliedFilters.control_number) params.control_number = docHistoryAppliedFilters.control_number
    if (docHistoryAppliedFilters.date_from) params.date_from = docHistoryAppliedFilters.date_from
    if (docHistoryAppliedFilters.date_to) params.date_to = docHistoryAppliedFilters.date_to
    return params
  }

  const extFor = (format) => (format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv')
  const handleExportTracking = (format) => {
    downloadReport('/reports/tracking', trackingExportParams(), `tracking-report-${new Date().toISOString().slice(0, 10)}.${extFor(format)}`, format)
  }
  const handleExportDocumentHistory = (format) => {
    downloadReport('/reports/document-history', docHistoryExportParams(), `document-history-${new Date().toISOString().slice(0, 10)}.${extFor(format)}`, format)
  }
  const handleExportAccountability = (format) => {
    downloadReport('/reports/accountability', accAppliedFilters, `accountability-report-${new Date().toISOString().slice(0, 10)}.${extFor(format)}`, format)
  }

  const parseDateStart = (value) => {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  const parseDateEnd = (value) => {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(23, 59, 59, 999)
    return d
  }
  const withinRange = (dateValue, fromValue, toValue) => {
    if (!fromValue && !toValue) return true
    const d = dateValue ? new Date(dateValue) : null
    if (!d || Number.isNaN(d.getTime())) return false
    const from = parseDateStart(fromValue)
    const to = parseDateEnd(toValue)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const trackingFiltered = (tracking.data || []).filter((d) => {
    if (appliedFilters.status && d.status !== appliedFilters.status) return false
    const movedAt = d.last_movement?.moved_at || d.updated_at || d.created_at
    if (!withinRange(movedAt, appliedFilters.date_from, appliedFilters.date_to)) return false
    return true
  })

  const docHistoryFiltered = (docHistory.data || []).filter((e) => {
    const cn = String(docHistoryAppliedFilters.control_number || '').trim().toLowerCase()
    if (cn) {
      if (!String(e.control_number || '').toLowerCase().includes(cn)) return false
    }
    const movedAt = e.moved_at || e.created_at
    if (!withinRange(movedAt, docHistoryAppliedFilters.date_from, docHistoryAppliedFilters.date_to)) return false
    return true
  })

  const accountabilityFiltered = (accountability.data || []).filter((e) => {
    if (accAppliedFilters.user_id) {
      const uid = e.user_id ?? e.user?.id ?? ''
      if (String(uid) !== String(accAppliedFilters.user_id)) return false
    }
    const movedAt = e.moved_at || e.created_at
    if (!withinRange(movedAt, accAppliedFilters.date_from, accAppliedFilters.date_to)) return false
    return true
  })

  const totalTracking = trackingFiltered.length
  const totalDocHistory = docHistoryFiltered.length
  const totalAccountability = accountabilityFiltered.length

  return (
    <div className="page-enter">
      {/* Header card with icon and description – aligned with MyDocuments */}
      {loading ? (
        <div className="card border-0 shadow-sm w-100 mb-3">
          <div
            className="card-header border-0"
            style={{
              backgroundColor: '#d3e9d7',
              borderBottom: '1px solid #b5d3ba',
            }}
          >
            <div className="d-flex flex-column flex-md-row align-items-flex-start align-items-md-center gap-2 gap-md-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  backgroundColor: '#0C8A3B',
                  color: '#ffffff',
                }}
              >
                <i className="fas fa-chart-bar" />
              </div>
              <div>
                <h2
                  className="mb-1"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: '#1f2933',
                  }}
                >
                  Reports
                </h2>
                <p
                  className="mb-0"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  Loading tracking, document history, and accountability reports&hellip;
                </p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="d-flex flex-column align-items-center justify-content-center py-4">
              <div
                className="spinner-border"
                role="status"
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  color: '#0C8A3B',
                }}
              />
              <p
                className="mt-3 mb-0 text-muted"
                style={{
                  fontFamily:
                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontSize: '0.9rem',
                }}
              >
                Please wait while we prepare your reports.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card border-0 shadow-sm w-100 mb-3"
          style={{
            opacity: showContent ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
        >
          <div
            className="card-header border-0"
            style={{
              backgroundColor: '#d3e9d7',
              borderBottom: '1px solid #b5d3ba',
            }}
          >
            <div className="d-flex flex-column flex-md-row align-items-flex-start align-items-md-center gap-2 gap-md-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  backgroundColor: '#0C8A3B',
                  color: '#ffffff',
                }}
              >
                <i className="fas fa-chart-bar" />
              </div>
              <div className="flex-grow-1">
                <h2
                  className="mb-1"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: '#1f2933',
                  }}
                >
                  Reports
                </h2>
                <p
                  className="mb-0"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  Export-ready tracking, document history, and accountability views.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2 mt-2 mt-md-0">
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  style={{
                    borderRadius: 999,
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.8rem',
                  }}
                  onClick={() => {
                    setSummaryClosing(false)
                    setSummaryModalOpen(true)
                  }}
                >
                  <i className="fas fa-info-circle me-1" />
                  View summary
                </button>
              </div>
            </div>
          </div>
          <div className="card-body pt-0 px-0">
            {/* Tabs – responsive nav for mobile/desktop */}
          <div
            className="px-3 pt-3 pb-2 border-bottom"
            style={{
              backgroundColor: '#f4fbf6',
            }}
          >
            <div className="d-flex flex-wrap gap-2">
              {[
                {
                  key: 'tracking',
                  icon: 'fas fa-route',
                  label: 'Tracking report',
                },
                {
                  key: 'document-history',
                  icon: 'fas fa-book',
                  label: 'Document history',
                },
                {
                  key: 'accountability',
                  icon: 'fas fa-user-check',
                  label: 'Accountability report',
                },
              ].map((tab) => {
                const active = reportTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setReportTab(tab.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 999,
                      paddingInline: '1rem',
                      paddingBlock: '0.45rem',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: active ? '#0C8A3B' : '#d1e2d6',
                      backgroundColor: active ? '#0C8A3B' : '#ffffff',
                      color: active ? '#ffffff' : '#111827',
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '0.8rem',
                      fontWeight: active ? 600 : 500,
                      boxShadow: active
                        ? '0 2px 6px rgba(12, 138, 59, 0.35)'
                        : '0 1px 2px rgba(15, 23, 42, 0.06)',
                    }}
                  >
                    <i className={tab.icon} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

            {/* Tab content area */}
            <div className="px-3 pb-3">
              {reportTab === 'tracking' && (
                <>
                  <div className="card mb-3 border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex flex-column flex-md-row align-items-flex-start align-items-md-center justify-content-between gap-2 mb-3">
                        <div>
                          <div
                            className="text-uppercase text-muted small"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              letterSpacing: '0.06em',
                            }}
                          >
                            Tracking filters
                          </div>
                        </div>
                      </div>
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                          <label className="form-label mb-1 small">Date from</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={filters.date_from}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, date_from: e.target.value }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                          <label className="form-label mb-1 small">Date to</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={filters.date_to}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, date_to: e.target.value }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                        <div className="col-12 col-sm-6 col-md-4 col-lg-3">
                          <label className="form-label mb-1 small">Status</label>
                          <select
                            className="form-select form-select-sm"
                            value={filters.status}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, status: e.target.value }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          >
                            <option value="">All</option>
                            <option value="in_transit">Released</option>
                            <option value="with_personnel">Received</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div className="col-12 col-lg">
                          <div className="d-flex flex-wrap gap-2 justify-content-start justify-content-lg-end align-items-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={resetTrackingFilters}
                              style={{
                                borderRadius: 3,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.78rem',
                                paddingInline: '0.8rem',
                                whiteSpace: 'nowrap',
                                transition:
                                  'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f9fafb'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#111827'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#374151'
                              }}
                            >
                              <i className="fas fa-undo me-1" />
                              Reset filter
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={refreshTracking}
                              disabled={trackingLoading}
                              style={{
                                borderRadius: 3,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.78rem',
                                paddingInline: '0.8rem',
                                whiteSpace: 'nowrap',
                                transition:
                                  'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb'
                                  e.currentTarget.style.borderColor = '#d1d5db'
                                  e.currentTarget.style.color = '#111827'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#374151'
                              }}
                            >
                              {trackingLoading ? (
                                <span className="spinner-border spinner-border-sm me-1" />
                              ) : (
                                <i className="fas fa-sync-alt me-1" />
                              )}
                              Refresh
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setAppliedFilters(filters)}
                              style={{
                                borderRadius: 6,
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.78rem',
                                paddingInline: '0.8rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Apply filters
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm reports-export-btn"
                              onClick={() => handleExportTracking('xlsx')}
                              style={{
                                borderRadius: 999,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ecfdf3',
                                color: '#166534',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.75rem',
                                paddingInline: '0.7rem',
                                whiteSpace: 'nowrap',
                                transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#d1fae5'
                                e.currentTarget.style.borderColor = '#a7f3d0'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ecfdf3'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <i className="fas fa-file-excel me-1" /> Excel
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm reports-export-btn"
                              onClick={() => handleExportTracking('pdf')}
                              style={{
                                borderRadius: 999,
                                borderColor: '#fecaca',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.75rem',
                                paddingInline: '0.7rem',
                                whiteSpace: 'nowrap',
                                transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fee2e2'
                                e.currentTarget.style.borderColor = '#fecaca'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2'
                                e.currentTarget.style.borderColor = '#fecaca'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <i className="fas fa-file-pdf me-1" /> PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white">
                      <span
                        className="small text-muted text-uppercase"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Tracking report
                      </span>
                    </div>
                    <div className="card-body p-0">
                      {trackingLoading ? (
                        <div className="p-4 text-center">
                          <span className="spinner-border spinner-border-sm" /> Loading...
                        </div>
                      ) : trackingFiltered.length > 0 ? (
                        <div className="table-responsive">
                          <table
                            className="table table-hover mb-0 align-middle w-100"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.87rem',
                              tableLayout: 'auto',
                              width: '100%',
                            }}
                          >
                            <thead
                              style={{
                                backgroundColor: '#f9fafb',
                              }}
                            >
                              <tr>
                                <th style={{ width: '3rem', minWidth: '2.5rem' }}>#</th>
                                <th>Control number</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Current holder</th>
                                <th>Last action</th>
                                <th>Last moved</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trackingFiltered.map((d, index) => (
                                <tr key={d.id}>
                                  <td>{index + 1}</td>
                                  <td>{d.control_number}</td>
                                  <td>{d.document_type?.name ?? '—'}</td>
                                  <td>
                                    <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                      {statusLabel(d.status)}
                                    </span>
                                  </td>
                                  <td>{d.current_holder?.name ?? '—'}</td>
                                  <td>{d.last_movement?.action ?? '—'}</td>
                                  <td>
                                    {d.last_movement?.moved_at
                                      ? new Date(d.last_movement.moved_at).toLocaleString()
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted p-4 mb-0">
                          No data for the selected filters.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {reportTab === 'document-history' && (
                <>
                  <div className="card mb-3 border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex flex-column flex-md-row align-items-flex-start align-items-md-center justify-content-between gap-2 mb-2">
                        <div>
                          <div
                            className="text-uppercase text-muted small"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              letterSpacing: '0.06em',
                            }}
                          >
                            Document history filters
                          </div>
                        </div>
                      </div>
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                          <label className="form-label mb-1 small">Control number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. PR-2025-001"
                            value={docHistoryFilters.control_number}
                            onChange={(e) =>
                              setDocHistoryFilters((f) => ({
                                ...f,
                                control_number: e.target.value,
                              }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                          <label className="form-label mb-1 small">Date from</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={docHistoryFilters.date_from}
                            onChange={(e) =>
                              setDocHistoryFilters((f) => ({
                                ...f,
                                date_from: e.target.value,
                              }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                          <label className="form-label mb-1 small">Date to</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={docHistoryFilters.date_to}
                            onChange={(e) =>
                              setDocHistoryFilters((f) => ({
                                ...f,
                                date_to: e.target.value,
                              }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                        <div className="col-12 col-lg d-flex flex-wrap gap-2 justify-content-start justify-content-lg-end align-items-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={resetDocHistoryFilters}
                            style={{
                              borderRadius: 3,
                              borderColor: '#d1d5db',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.82rem',
                              paddingInline: '0.95rem',
                              transition:
                                'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f9fafb'
                              e.currentTarget.style.borderColor = '#d1d5db'
                              e.currentTarget.style.color = '#111827'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff'
                              e.currentTarget.style.borderColor = '#d1d5db'
                              e.currentTarget.style.color = '#374151'
                            }}
                          >
                            <i className="fas fa-undo me-1" />
                            Reset filter
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={refreshDocumentHistory}
                            disabled={docHistoryLoading}
                            style={{
                              borderRadius: 3,
                              borderColor: '#d1d5db',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.82rem',
                              paddingInline: '0.95rem',
                              transition:
                                'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!e.currentTarget.disabled) {
                                e.currentTarget.style.backgroundColor = '#f9fafb'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#111827'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff'
                              e.currentTarget.style.borderColor = '#d1d5db'
                              e.currentTarget.style.color = '#374151'
                            }}
                          >
                            {docHistoryLoading ? (
                              <span className="spinner-border spinner-border-sm me-1" />
                            ) : (
                              <i className="fas fa-sync-alt me-1" />
                            )}
                            Refresh
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={!canRunDocHistory || docHistoryLoading}
                            onClick={runDocumentHistory}
                            style={{
                              borderRadius: 6,
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.82rem',
                              paddingInline: '0.95rem',
                            }}
                          >
                            {docHistoryLoading ? (
                              <span className="spinner-border spinner-border-sm me-1" />
                            ) : null}
                            Generate
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm reports-export-btn"
                            disabled={!canRunDocHistory}
                            onClick={() => handleExportDocumentHistory('xlsx')}
                            style={{
                              borderRadius: 999,
                              borderColor: '#d1d5db',
                              backgroundColor: '#ecfdf3',
                              color: '#166534',
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.8rem',
                              paddingInline: '0.85rem',
                              transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!e.currentTarget.disabled) {
                                e.currentTarget.style.backgroundColor = '#d1fae5'
                                e.currentTarget.style.borderColor = '#a7f3d0'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ecfdf3'
                              e.currentTarget.style.borderColor = '#d1d5db'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <i className="fas fa-file-excel me-1" /> Excel
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm reports-export-btn"
                            disabled={!canRunDocHistory}
                            onClick={() => handleExportDocumentHistory('pdf')}
                            style={{
                              borderRadius: 999,
                              borderColor: '#fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#b91c1c',
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.8rem',
                              paddingInline: '0.85rem',
                              transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!e.currentTarget.disabled) {
                                e.currentTarget.style.backgroundColor = '#fee2e2'
                                e.currentTarget.style.borderColor = '#fecaca'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2'
                              e.currentTarget.style.borderColor = '#fecaca'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <i className="fas fa-file-pdf me-1" /> PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white">
                      <span
                        className="small text-muted text-uppercase"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Document history (logbook)
                      </span>
                    </div>
                    <div className="card-body p-0">
                      {docHistoryLoading ? (
                        <div className="p-4 text-center">
                          <span className="spinner-border spinner-border-sm" /> Loading...
                        </div>
                      ) : docHistoryFiltered.length > 0 ? (
                        <div className="table-responsive">
                          <table
                            className="table table-hover mb-0 align-middle w-100"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.87rem',
                              tableLayout: 'auto',
                              width: '100%',
                            }}
                          >
                            <thead style={{ backgroundColor: '#f9fafb' }}>
                              <tr>
                                <th style={{ width: '3rem', minWidth: '2.5rem' }}>#</th>
                                <th>Control number</th>
                                <th>Document type</th>
                                <th>Action</th>
                                <th>User</th>
                                <th>Moved at</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {docHistoryFiltered.map((e, index) => (
                                <tr key={e.id}>
                                  <td style={{ width: '3rem', minWidth: '2.5rem' }}>{index + 1}</td>
                                  <td>{e.control_number ?? '—'}</td>
                                  <td>{e.document_type ?? '—'}</td>
                                  <td>
                                    <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                      {e.action}
                                    </span>
                                  </td>
                                  <td>{e.user?.name ?? '—'}</td>
                                  <td>
                                    {e.moved_at
                                      ? new Date(e.moved_at).toLocaleString()
                                      : '—'}
                                  </td>
                                  <td>{e.remarks ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted p-4 mb-0">
                          No logbook entries for the selected criteria.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {reportTab === 'accountability' && (
                <>
                  <div className="card mb-3 border-0 shadow-sm">
                    <div className="card-body">
                      <div
                        className="text-uppercase text-muted small mb-2"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Accountability filters
                      </div>
                      {/* Row 1: filters only — stacks on small screens */}
                      <div className="row g-2 align-items-end mb-3">
                        <div className="col-12 col-sm-6 col-md-4">
                          <label className="form-label mb-1 small">User</label>
                          <select
                            className="form-select form-select-sm"
                            value={accFilters.user_id}
                            onChange={(e) =>
                              setAccFilters((f) => ({ ...f, user_id: e.target.value }))
                            }
                            disabled={usersLoading}
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          >
                            <option value="">Select user...</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-sm-6 col-md-4">
                          <label className="form-label mb-1 small">Date from</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={accFilters.date_from}
                            onChange={(e) =>
                              setAccFilters((f) => ({ ...f, date_from: e.target.value }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                        <div className="col-12 col-sm-6 col-md-4">
                          <label className="form-label mb-1 small">Date to</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={accFilters.date_to}
                            onChange={(e) =>
                              setAccFilters((f) => ({ ...f, date_to: e.target.value }))
                            }
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.85rem',
                              borderColor: '#d1e2d6',
                              borderRadius: 6,
                              transition:
                                'border-color 0.25s ease, box-shadow 0.25s ease',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0C8A3B'
                              e.target.style.boxShadow =
                                '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#d1e2d6'
                              e.target.style.boxShadow = 'none'
                            }}
                          />
                        </div>
                      </div>
                      {/* Row 2: actions only — full width so buttons wrap cleanly */}
                      <div className="row">
                        <div className="col-12">
                          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-start">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={resetAccFilters}
                              style={{
                                borderRadius: 3,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.78rem',
                                paddingInline: '0.8rem',
                                whiteSpace: 'nowrap',
                                transition:
                                  'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f9fafb'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#111827'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#374151'
                              }}
                            >
                              <i className="fas fa-undo me-1" />
                              Reset filter
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={refreshAccountability}
                              disabled={accLoading}
                              style={{
                                borderRadius: 3,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.78rem',
                                paddingInline: '0.8rem',
                                whiteSpace: 'nowrap',
                                transition:
                                  'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb'
                                  e.currentTarget.style.borderColor = '#d1d5db'
                                  e.currentTarget.style.color = '#111827'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.color = '#374151'
                              }}
                            >
                              {accLoading ? (
                                <span className="spinner-border spinner-border-sm me-1" />
                              ) : (
                                <i className="fas fa-sync-alt me-1" />
                              )}
                              Refresh
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!canRunAccountability || accLoading}
                              onClick={runAccountability}
                              style={{
                                borderRadius: 6,
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.78rem',
                                paddingInline: '0.8rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {accLoading ? (
                                <span className="spinner-border spinner-border-sm me-1" />
                              ) : null}
                              Generate
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm reports-export-btn"
                              disabled={!canRunAccountability}
                              onClick={() => handleExportAccountability('xlsx')}
                              style={{
                                borderRadius: 999,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ecfdf3',
                                color: '#166534',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.75rem',
                                paddingInline: '0.7rem',
                                whiteSpace: 'nowrap',
                                transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.backgroundColor = '#d1fae5'
                                  e.currentTarget.style.borderColor = '#a7f3d0'
                                  e.currentTarget.style.transform = 'translateY(-1px)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ecfdf3'
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <i className="fas fa-file-excel me-1" /> Excel
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm reports-export-btn"
                              disabled={!canRunAccountability}
                              onClick={() => handleExportAccountability('pdf')}
                              style={{
                                borderRadius: 999,
                                borderColor: '#fecaca',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.75rem',
                                paddingInline: '0.7rem',
                                whiteSpace: 'nowrap',
                                transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.backgroundColor = '#fee2e2'
                                  e.currentTarget.style.borderColor = '#fecaca'
                                  e.currentTarget.style.transform = 'translateY(-1px)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2'
                                e.currentTarget.style.borderColor = '#fecaca'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <i className="fas fa-file-pdf me-1" /> PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white">
                      <span
                        className="small text-muted text-uppercase"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Accountability report
                      </span>
                    </div>
                    <div className="card-body p-0">
                      {accLoading ? (
                        <div className="p-4 text-center">
                          <span className="spinner-border spinner-border-sm" /> Loading...
                        </div>
                      ) : accountabilityFiltered.length > 0 ? (
                        <div className="table-responsive">
                          <table
                            className="table table-hover mb-0 align-middle w-100"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.87rem',
                              tableLayout: 'auto',
                              width: '100%',
                            }}
                          >
                            <thead style={{ backgroundColor: '#f9fafb' }}>
                              <tr>
                                <th style={{ width: '3rem', minWidth: '2.5rem' }}>#</th>
                                <th>Control number</th>
                                <th>Document type</th>
                                <th>Action</th>
                                <th>User</th>
                                <th>Moved at</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {accountabilityFiltered.map((e, index) => (
                                <tr key={e.id}>
                                  <td style={{ width: '3rem', minWidth: '2.5rem' }}>{index + 1}</td>
                                  <td>{e.control_number ?? '—'}</td>
                                  <td>{e.document_type ?? '—'}</td>
                                  <td>
                                    <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                      {e.action}
                                    </span>
                                  </td>
                                  <td>{e.user?.name ?? '—'}</td>
                                  <td>
                                    {e.moved_at
                                      ? new Date(e.moved_at).toLocaleString()
                                      : '—'}
                                  </td>
                                  <td>{e.remarks ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted p-4 mb-0">
                          No entries for the selected user and date range.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simple summary modal via Portal for consistency with MyDocuments */}
      {summaryModalOpen && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reports-summary-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                summaryClosing ? ' exit' : ''
              }`}
              onClick={() => {
                setSummaryClosing(true)
                setTimeout(() => {
                  setSummaryClosing(false)
                  setSummaryModalOpen(false)
                }, 200)
              }}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${
                summaryClosing ? ' exit' : ''
              }`}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 420,
                maxHeight: '90vh',
                background: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '1rem 1.5rem 0.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div>
                  <h5
                    id="reports-summary-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    Reports summary
                  </h5>
                  <p
                    className="mb-0"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    High-level counts for the current reports.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    setSummaryClosing(true)
                    setTimeout(() => {
                      setSummaryClosing(false)
                      setSummaryModalOpen(false)
                    }, 200)
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  padding: '1.5rem 1.5rem 1.25rem',
                }}
              >
                <div
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.9rem',
                    color: '#374151',
                  }}
                >
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Tracking rows</span>
                    <span className="fw-semibold">{totalTracking}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Document history rows</span>
                    <span className="fw-semibold">{totalDocHistory}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Accountability rows</span>
                    <span className="fw-semibold">{totalAccountability}</span>
                  </div>
                </div>
              </div>
              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={() => {
                    setSummaryClosing(true)
                    setTimeout(() => {
                      setSummaryClosing(false)
                      setSummaryModalOpen(false)
                    }, 200)
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

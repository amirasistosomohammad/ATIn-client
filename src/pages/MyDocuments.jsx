import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { documentService } from '../services/documentService'
import { toast } from 'react-toastify'
import Portal from '../components/Portal.jsx'

export default function MyDocuments() {
  const [allDocuments, setAllDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    controlNumber: '',
    status: '',
    documentTypeId: '',
  })
  const [types, setTypes] = useState([])
  const [activeSummaryModal, setActiveSummaryModal] = useState(null)
  const [summaryClosing, setSummaryClosing] = useState(false)
  const [detailsDocument, setDetailsDocument] = useState(null)
  const [detailsClosing, setDetailsClosing] = useState(false)
  const [editDocument, setEditDocument] = useState(null)
  const [editClosing, setEditClosing] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    control_number: '',
    document_type_id: '',
    description: '',
  })
  const [perPage, setPerPage] = useState(15)

  const totalDocuments = allDocuments.length
  const totalInTransit = allDocuments.filter((d) => d.status === 'in_transit').length
  const totalWithPersonnel = allDocuments.filter((d) => d.status === 'with_personnel').length

  const statusLabel = (status) => {
    if (status === 'in_transit') return 'Released'
    if (status === 'with_personnel') return 'Received'
    return status
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    try {
      const d = new Date(value)
      return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return '—'
    }
  }

  // Client-side filtered & paginated documents
  const filteredDocuments = allDocuments.filter((doc) => {
    if (filters.controlNumber.trim()) {
      const q = filters.controlNumber.trim().toLowerCase()
      if (!doc.control_number?.toLowerCase().includes(q)) return false
    }
    if (filters.status) {
      if (doc.status !== filters.status) return false
    }
    if (filters.documentTypeId) {
      if (String(doc.document_type_id) !== String(filters.documentTypeId)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / perPage))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * perPage
  const pageItems = filteredDocuments.slice(pageStart, pageStart + perPage)

  // Pagination: page numbers to show (with ellipsis)
  const paginationPages = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const list = [1]
    if (safePage > 3) list.push('ellipsis')
    const low = Math.max(2, safePage - 1)
    const high = Math.min(totalPages - 1, safePage + 1)
    for (let p = low; p <= high; p++) if (!list.includes(p)) list.push(p)
    if (safePage < totalPages - 2) list.push('ellipsis')
    if (totalPages > 1) list.push(totalPages)
    return list
  })()

  // Reset to page 1 when per-page changes
  useEffect(() => {
    setPage(1)
  }, [perPage])

  // Load all of the current user's documents once, then filter client-side for fast UX.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await documentService.getDocuments({
          created_by_me: 1,
          per_page: 1000,
          page: 1,
        })
        if (cancelled) return
        setAllDocuments(res.data || [])
      } catch (err) {
        toast.error(err?.message || 'Failed to load documents')
        if (!cancelled) setAllDocuments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load document types for the filter panel.
  useEffect(() => {
    documentService
      .getDocumentTypes()
      .then(setTypes)
      .catch(() => {
        // Fail silently for filter options; core list still works.
      })
  }, [])

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true))
      return () => cancelAnimationFrame(id)
    }
    setShowContent(false)
  }, [loading])

  const openDetails = (doc) => {
    setDetailsClosing(false)
    setDetailsDocument(doc)
  }

  const closeDetails = () => {
    setDetailsClosing(true)
    setTimeout(() => {
      setDetailsClosing(false)
      setDetailsDocument(null)
    }, 200)
  }

  const openEdit = (doc) => {
    setEditClosing(false)
    setEditDocument(doc)
    setEditForm({
      control_number: doc.control_number || '',
      document_type_id: doc.document_type_id || doc.document_type?.id || '',
      description: doc.description || '',
    })
  }

  const closeEdit = ({ force = false } = {}) => {
    if (editSubmitting && !force) return
    setEditClosing(true)
    setTimeout(() => {
      setEditClosing(false)
      setEditDocument(null)
      setEditForm({
        control_number: '',
        document_type_id: '',
        description: '',
      })
      setEditSubmitting(false)
    }, 200)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editDocument) return

    const payload = {}
    if (editForm.control_number.trim() && editForm.control_number !== editDocument.control_number) {
      payload.control_number = editForm.control_number.trim()
    }
    if (
      String(editForm.document_type_id || '') &&
      String(editForm.document_type_id) !== String(editDocument.document_type_id)
    ) {
      payload.document_type_id = Number(editForm.document_type_id)
    }
    payload.description = editForm.description.trim() || null

    setEditSubmitting(true)
    try {
      const updated = await documentService.updateDocument(editDocument.id, payload)
      setAllDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
      )
      toast.success('Document updated')
      closeEdit({ force: true })
    } catch (err) {
      toast.error(err?.message || 'Failed to update document')
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <div className="page-enter">
      {loading ? (
        <div className="card border-0 shadow-sm w-100">
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
                <i className="fas fa-folder-open" />
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
                  My documents
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
                  Loading your registered control numbers&hellip;
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
                Please wait while we load your documents.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card border-0 shadow-sm w-100"
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
                <i className="fas fa-folder-open" />
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
                  My documents
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
                  Control numbers you registered. Click a row to track and view logbook details.
                </p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {/* Summary cards row */}
            <div className="px-3 pt-3 pb-2 border-bottom" style={{ backgroundColor: '#f4fbf6' }}>
              <div className="row g-3">
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="p-3 rounded-3 h-100"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1e2d6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition:
                        'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f7f3'
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 118, 110, 0.10)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onClick={() => {
                      setSummaryClosing(false)
                      setActiveSummaryModal('total')
                    }}
                  >
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        minHeight: 36,
                        backgroundColor: '#e5f3ea',
                        color: '#0C8A3B',
                      }}
                    >
                      <i className="fas fa-list-ul" />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#6b7280',
                          marginBottom: 4,
                        }}
                      >
                        Total documents
                      </div>
                      <div
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontWeight: 700,
                          fontSize: '1.25rem',
                          color: '#111827',
                        }}
                      >
                        {totalDocuments}
                      </div>
                      <div
                        className="text-muted"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontSize: '0.8rem',
                        }}
                      >
                        Control numbers you registered.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="p-3 rounded-3 h-100"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1e2d6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition:
                        'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f7f3'
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 118, 110, 0.10)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onClick={() => {
                      setSummaryClosing(false)
                      setActiveSummaryModal('in_transit')
                    }}
                  >
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        minHeight: 36,
                        backgroundColor: '#e5f3ea',
                        color: '#0C8A3B',
                      }}
                    >
                      <i className="fas fa-route" />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#6b7280',
                          marginBottom: 4,
                        }}
                      >
                        Released
                      </div>
                      <div
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontWeight: 700,
                          fontSize: '1.25rem',
                          color: '#111827',
                        }}
                      >
                        {totalInTransit}
                      </div>
                      <div
                        className="text-muted"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontSize: '0.8rem',
                        }}
                      >
                        Documents currently moving between personnel.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="p-3 rounded-3 h-100"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1e2d6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition:
                        'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f7f3'
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 118, 110, 0.10)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onClick={() => {
                      setSummaryClosing(false)
                      setActiveSummaryModal('with_personnel')
                    }}
                  >
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        minHeight: 36,
                        backgroundColor: '#e5f3ea',
                        color: '#0C8A3B',
                      }}
                    >
                      <i className="fas fa-user-friends" />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#6b7280',
                          marginBottom: 4,
                        }}
                      >
                        Received
                      </div>
                      <div
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontWeight: 700,
                          fontSize: '1.25rem',
                          color: '#111827',
                        }}
                      >
                        {totalWithPersonnel}
                      </div>
                      <div
                        className="text-muted"
                        style={{
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          fontSize: '0.8rem',
                        }}
                      >
                        Documents currently assigned to staff.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Filter/search toolbar */}
            <div
              className="px-3 pt-3 pb-2 border-bottom"
              style={{
                backgroundColor: '#f9fafb',
              }}
            >
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-4">
                  <label
                    htmlFor="mydocs_control_search"
                    className="form-label mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    Control number
                  </label>
                  <div className="position-relative">
                    <input
                      id="mydocs_control_search"
                      type="text"
                      className="form-control form-control-sm pe-5"
                      placeholder="Search control number..."
                      value={filters.controlNumber}
                      onChange={(e) => {
                        const value = e.target.value
                        setFilters((prev) => ({ ...prev, controlNumber: value }))
                        setPage(1)
                      }}
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.85rem',
                        borderColor: '#d1e2d6',
                        borderRadius: 6,
                        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0C8A3B'
                        e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1e2d6'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    {filters.controlNumber.trim() && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="btn btn-sm btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-2"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, controlNumber: '' }))
                          setPage(1)
                        }}
                        style={{
                          color: '#9ca3af',
                          textDecoration: 'none',
                        }}
                      >
                        <i className="fas fa-times-circle" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <label
                    htmlFor="mydocs_status_filter"
                    className="form-label mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    Status
                  </label>
                  <select
                    id="mydocs_status_filter"
                    className="form-select form-select-sm"
                    value={filters.status}
                    onChange={(e) => {
                      const value = e.target.value
                      setFilters((prev) => ({ ...prev, status: value }))
                      setPage(1)
                    }}
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '0.85rem',
                      borderColor: '#d1e2d6',
                      borderRadius: 6,
                      transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0C8A3B'
                      e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1e2d6'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <option value="">All statuses</option>
                    <option value="in_transit">Released</option>
                    <option value="with_personnel">Received</option>
                  </select>
                </div>
                <div className="col-12 col-md-4">
                  <label
                    htmlFor="mydocs_type_filter"
                    className="form-label mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    Document type
                  </label>
                  <div className="d-flex gap-2">
                    <select
                      id="mydocs_type_filter"
                      className="form-select form-select-sm"
                      value={filters.documentTypeId}
                      onChange={(e) => {
                        const value = e.target.value
                        setFilters((prev) => ({ ...prev, documentTypeId: value }))
                        setPage(1)
                      }}
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.85rem',
                        borderColor: '#d1e2d6',
                        borderRadius: 6,
                        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0C8A3B'
                        e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1e2d6'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      <option value="">All types</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.code ? ` (${t.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      style={{
                        whiteSpace: 'nowrap',
                        borderRadius: 999,
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.8rem',
                        borderColor: '#d1d5db',
                        color: '#374151',
                        paddingInline: '0.9rem',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                        e.currentTarget.style.color = '#111827'
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(15, 23, 42, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                        e.currentTarget.style.borderColor = '#d1d5db'
                        e.currentTarget.style.color = '#374151'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      onClick={() => {
                        setFilters({ controlNumber: '', status: '', documentTypeId: '' })
                        setPage(1)
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results table */}
            {filteredDocuments.length === 0 ? (
              <div
                className="text-center py-5 px-4"
                style={{
                  backgroundColor: '#f8faf9',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: '#e5f3ea',
                    color: '#0C8A3B',
                  }}
                >
                  <i className="fas fa-search" style={{ fontSize: '1.1rem' }} />
                </div>
                <h3
                  className="mb-2"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: '#1f2937',
                  }}
                >
                  No matching documents
                </h3>
                <p
                  className="mb-3 mx-auto"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    maxWidth: 360,
                  }}
                >
                  No control numbers match the current search or filters. Try adjusting your criteria or register a new document.
                </p>
                <Link
                  to="/documents/register"
                  className="btn btn-sm"
                  style={{
                    borderRadius: 6,
                    backgroundColor: '#0C8A3B',
                    borderColor: '#0C8A3B',
                    color: '#ffffff',
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    paddingInline: '1rem',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0A6B2E'
                    e.currentTarget.style.borderColor = '#0A6B2E'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0C8A3B'
                    e.currentTarget.style.borderColor = '#0C8A3B'
                  }}
                >
                  <i className="fas fa-plus-circle me-1" />
                  Register control number
                </Link>
              </div>
            ) : (
              <div
                className="table-responsive"
                style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
              >
                <table
                  className="table table-hover mb-0 align-middle"
                  style={{
                    minWidth: 980,
                    tableLayout: 'auto',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '2.5rem' }}>#</th>
                      <th style={{ width: '13rem' }}>Actions</th>
                      <th style={{ width: '9rem' }}>Control number</th>
                      <th style={{ width: '14rem' }}>Type</th>
                      <th style={{ width: '12rem' }}>Current holder</th>
                      <th style={{ width: '7rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((doc, index) => {
                      const rowNumber = pageStart + index + 1
                      const truncateStyle = {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                        display: 'block',
                      }
                      return (
                        <tr key={doc.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{rowNumber}</td>
                          <td style={{ whiteSpace: 'nowrap', minWidth: '13rem' }}>
                            <div className="d-flex flex-nowrap gap-1">
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center btn-outline-secondary"
                                onClick={() => openDetails(doc)}
                                style={{
                                  borderRadius: 3,
                                  borderColor: '#d1d5db',
                                  backgroundColor: '#ffffff',
                                  color: '#374151',
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '0.72rem',
                                  padding: '0.25rem 0.35rem',
                                  minWidth: 0,
                                  flex: '0 0 auto',
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
                                <i className="fas fa-eye me-1 flex-shrink-0" aria-hidden />
                                <span className="text-truncate">Details</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center btn-outline-secondary"
                                onClick={() => openEdit(doc)}
                                style={{
                                  borderRadius: 3,
                                  borderColor: '#d1d5db',
                                  backgroundColor: '#ffffff',
                                  color: '#374151',
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '0.72rem',
                                  padding: '0.25rem 0.35rem',
                                  minWidth: 0,
                                  flex: '0 0 auto',
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
                                <i className="fas fa-edit me-1 flex-shrink-0" aria-hidden />
                                <span className="text-truncate">Edit</span>
                              </button>
                              <Link
                                to="/track"
                                state={{ controlNumber: doc.control_number }}
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center btn-outline-secondary"
                                style={{
                                  borderRadius: 3,
                                  borderColor: '#d1d5db',
                                  backgroundColor: '#ffffff',
                                  color: '#374151',
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '0.72rem',
                                  padding: '0.25rem 0.35rem',
                                  minWidth: 0,
                                  flex: '0 0 auto',
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
                                <i className="fas fa-book me-1 flex-shrink-0" aria-hidden />
                                <span className="text-truncate">Logbook</span>
                              </Link>
                            </div>
                          </td>
                          <td style={{ overflow: 'hidden' }} title={doc.control_number || ''}>
                            <span
                              style={{
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                ...truncateStyle,
                              }}
                            >
                              {doc.control_number}
                            </span>
                          </td>
                          <td style={{ overflow: 'hidden' }} title={doc.document_type?.name ?? ''}>
                            <span
                              style={{
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.9rem',
                                ...truncateStyle,
                              }}
                            >
                              {doc.document_type?.name ?? '—'}
                            </span>
                          </td>
                          <td style={{ overflow: 'hidden' }} title={doc.current_holder?.name ?? ''}>
                            <span
                              style={{
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.9rem',
                                ...truncateStyle,
                              }}
                            >
                              {doc.current_holder?.name ?? 'Released'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span
                              className="badge bg-secondary text-uppercase"
                              style={{
                                fontFamily:
                                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                fontSize: '0.7rem',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {statusLabel(doc.status)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {filteredDocuments.length > 0 && !loading && (
        <div className="travel-orders-pagination-wrap mt-3 pt-3">
          <div
            className="travel-orders-pagination d-flex flex-wrap align-items-center justify-content-between gap-2"
            style={{
              fontFamily:
                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            }}
          >
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="travel-orders-pagination-info text-muted">
                Showing {pageStart + 1}–{Math.min(pageStart + pageItems.length, filteredDocuments.length)} of{' '}
                {filteredDocuments.length}
              </span>
              <label className="d-flex align-items-center gap-1 mb-0">
                <span className="text-muted small">Per page</span>
                <select
                  className="travel-orders-per-page-select form-select form-select-sm"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  aria-label="Items per page"
                >
                  {[10, 15, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-1">
              <button
                type="button"
                className="travel-orders-pagination-btn"
                disabled={safePage <= 1}
                onClick={() => setPage(1)}
                aria-label="First page"
              >
                <i className="fas fa-angle-double-left" aria-hidden />
              </button>
              <button
                type="button"
                className="travel-orders-pagination-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <i className="fas fa-angle-left" aria-hidden />
              </button>
              {paginationPages.map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e-${i}`} className="travel-orders-pagination-ellipsis px-1">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`travel-orders-pagination-btn travel-orders-pagination-btn-num ${safePage === p ? 'active' : ''}`}
                    disabled={safePage === p}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={safePage === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                className="travel-orders-pagination-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <i className="fas fa-angle-right" aria-hidden />
              </button>
              <button
                type="button"
                className="travel-orders-pagination-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="Last page"
              >
                <i className="fas fa-angle-double-right" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary "view full count" modal – DATravelApp-style compact count dialog */}
      {activeSummaryModal && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mydocs-summary-modal-title"
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
                  setActiveSummaryModal(null)
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
              {/* Header like MidTaskApp screenshot */}
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
                    id="mydocs-summary-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    {activeSummaryModal === 'total' && 'Total documents'}
                    {activeSummaryModal === 'in_transit' && 'Documents in transit'}
                    {activeSummaryModal === 'with_personnel' && 'Documents with personnel'}
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
                    Full count recorded in the system
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    setSummaryClosing(true)
                    setTimeout(() => {
                      setSummaryClosing(false)
                      setActiveSummaryModal(null)
                    }, 200)
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Centered big number */}
              <div
                style={{
                  padding: '2.25rem 1.5rem 1.75rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '2.4rem',
                    color: '#0C8A3B',
                    marginBottom: '0.6rem',
                  }}
                >
                  {activeSummaryModal === 'total' && totalDocuments}
                  {activeSummaryModal === 'in_transit' && totalInTransit}
                  {activeSummaryModal === 'with_personnel' && totalWithPersonnel}
                </div>
                <div
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                  }}
                >
                  {activeSummaryModal === 'total' && 'Total document records'}
                  {activeSummaryModal === 'in_transit' && 'Documents currently in transit'}
                  {activeSummaryModal === 'with_personnel' && 'Documents currently with personnel'}
                </div>
              </div>

              {/* Footer with single Close button */}
              <div
                className="account-approvals-detail-footer"
              >
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={() => {
                    setSummaryClosing(true)
                    setTimeout(() => {
                      setSummaryClosing(false)
                      setActiveSummaryModal(null)
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
      {detailsDocument && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mydocs-details-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                detailsClosing ? ' exit' : ''
              }`}
              onClick={closeDetails}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${
                detailsClosing ? ' exit' : ''
              }`}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 560,
                maxHeight: '90vh',
                background: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '1rem 1.5rem 0.75rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div>
                  <h5
                    id="mydocs-details-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    Document details
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
                    View the registration details of this control number.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={closeDetails}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
                <div className="mb-3">
                  <div
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: '#111827',
                    }}
                  >
                    {detailsDocument.control_number}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '0.9rem',
                      color: '#6b7280',
                    }}
                  >
                    {detailsDocument.document_type?.name || 'No document type'}
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                      Date created
                    </div>
                    <div className="fw-semibold">{formatDateTime(detailsDocument.created_at)}</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                      Last updated
                    </div>
                    <div className="fw-semibold">{formatDateTime(detailsDocument.updated_at)}</div>
                  </div>
                  <div className="col-12">
                    <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                      Description
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {detailsDocument.description || 'No description provided.'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={closeDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {editDocument && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mydocs-edit-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                editClosing ? ' exit' : ''
              }`}
              onClick={closeEdit}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${
                editClosing ? ' exit' : ''
              }`}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 560,
                maxHeight: '90vh',
                background: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '1rem 1.5rem 0.75rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div>
                  <h5
                    id="mydocs-edit-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    Edit document
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
                    Update the registration details for this control number.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={closeEdit}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div
                  style={{
                    padding: '1.25rem 1.5rem 1rem',
                    overflowY: 'auto',
                    maxHeight: 'calc(90vh - 110px)',
                  }}
                >
                  <div className="mb-3">
                    <label className="form-label mb-1 small">Control number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.control_number}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, control_number: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1 small">Document type</label>
                    <select
                      className="form-select form-select-sm"
                      value={editForm.document_type_id}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, document_type_id: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select type</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.code ? ` (${t.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1 small">Description</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>
                  <div className="row g-3">
                    {/* Intentionally left blank to keep the edit form focused on the same core fields as registration (control number, document type, description). */}
                  </div>
                </div>
                <div className="account-approvals-detail-footer">
                  <button
                    type="button"
                    className="btn btn-light account-approvals-detail-close-btn"
                    onClick={closeEdit}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={editSubmitting}
                    style={{
                      borderRadius: 10,
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      minWidth: 130,
                    }}
                  >
                    {editSubmitting && (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    <span>{editSubmitting ? 'Saving…' : 'Save changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

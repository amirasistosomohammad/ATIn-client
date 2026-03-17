import React, { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { showToast } from '../../services/notificationService'
import Portal from '../../components/Portal.jsx'

function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [activeSummaryModal, setActiveSummaryModal] = useState(null)
  const [summaryClosing, setSummaryClosing] = useState(false)
  const [detailsUser, setDetailsUser] = useState(null)
  const [detailsClosing, setDetailsClosing] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'activate'|'deactivate'|'delete', user }
  const [confirmClosing, setConfirmClosing] = useState(false)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [remarksByUserId, setRemarksByUserId] = useState({}) // { [id]: { type, remarks, at } }

  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await authService.getUsers()
        if (!cancelled) {
          // hide the lone admin account from the grid
          const list = Array.isArray(data) ? data.filter((u) => u.role !== 'admin') : []
          setUsers(list)
          // seed remarks from server so deactivation_remarks show in grid/details
          setRemarksByUserId((prev) => {
            const next = { ...prev }
            list.forEach((u) => {
              if (u.deactivation_remarks != null && String(u.deactivation_remarks).trim() !== '') {
                next[u.id] = {
                  type: 'deactivate',
                  remarks: u.deactivation_remarks,
                  at: null,
                }
              }
            })
            return next
          })
        }
      } catch (err) {
        if (!cancelled) {
          setUsers([])
          showToast.error(err?.message || 'Failed to load users.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleActive = async (u) => {
    const next = u.is_active === false
    try {
      const data = await authService.updateUser(u.id, { is_active: next })
      const updated = data?.user ? { ...u, ...data.user } : { ...u, is_active: next }
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
      showToast.success(`User ${next ? 'activated' : 'deactivated'}: ${u.name}`)
    } catch (err) {
      showToast.error(err?.message || 'Failed to update user.')
    }
  }

  const saveRemark = (userId, type, text) => {
    const payload = {
      type,
      remarks: text?.trim() || '',
      at: new Date().toISOString(),
    }
    setRemarksByUserId((prev) => ({ ...prev, [userId]: payload }))

    // Also persist by email in localStorage so that the login screen
    // can show these remarks later even if the backend does not send them.
    try {
      const user = users.find((u) => u.id === userId)
      if (user?.email) {
        const key = 'deactivationRemarksByEmail'
        const raw = window.localStorage.getItem(key)
        const map = raw ? JSON.parse(raw) : {}
        const emailKey = (user.email || '').toLowerCase()
        if (emailKey) {
          map[emailKey] = {
            type,
            remarks: payload.remarks,
            at: payload.at,
          }
          window.localStorage.setItem(key, JSON.stringify(map))
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  const openConfirm = (type, u) => {
    setConfirmClosing(false)
    setConfirmAction({ type, user: u })
    setRemarks('')
  }

  const submitConfirm = async () => {
    const action = confirmAction
    if (!action?.user) return
    const u = action.user
    const text = remarks.trim()

    setConfirmSubmitting(true)
    try {
      if (action.type === 'activate') {
        const data = await authService.updateUser(u.id, { is_active: true })
        const updated = data?.user ? { ...u, ...data.user } : { ...u, is_active: true }
        setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
        if (detailsUser?.id === u.id) setDetailsUser(updated)
        saveRemark(u.id, 'activate', text || 'Activated')
        showToast.success(`Activated: ${u.name}`)
      }

      if (action.type === 'deactivate') {
        const data = await authService.updateUser(u.id, {
          is_active: false,
          deactivation_remarks: text?.trim() || null,
        })
        const updated = data?.user ? { ...u, ...data.user } : { ...u, is_active: false, deactivation_remarks: text?.trim() || null }
        setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
        if (detailsUser?.id === u.id) setDetailsUser(updated)
        saveRemark(u.id, 'deactivate', text)
        showToast.success(`Deactivated: ${u.name}`)
      }

      if (action.type === 'delete') {
        await authService.deleteUser(u.id)
        saveRemark(u.id, 'delete', text)
        setUsers((prev) => prev.filter((x) => x.id !== u.id))
        if (detailsUser?.id === u.id) setDetailsUser(null)
        showToast.success(`Deleted: ${u.name}`)
      }

      setConfirmClosing(true)
      setTimeout(() => {
        setConfirmClosing(false)
        setConfirmAction(null)
        setConfirmSubmitting(false)
      }, 200)
    } catch (err) {
      showToast.error(err?.message || 'Action failed.')
      setConfirmSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    let list = users
    if (statusFilter === 'active') list = list.filter((u) => u.is_active !== false)
    if (statusFilter === 'inactive') list = list.filter((u) => u.is_active === false)

    const q = search.trim().toLowerCase()
    if (!q) return list

    return list.filter((u) => {
      const name = (u.name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const section = (u.section_unit || '').toLowerCase()
      const designation = (u.designation_position || '').toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        section.includes(q) ||
        designation.includes(q)
      )
    })
  }, [users, statusFilter, search])

  const total = users.length
  const active = users.filter((u) => u.is_active !== false).length
  const inactive = users.filter((u) => u.is_active === false).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * perPage
  const pageItems = filtered.slice(pageStart, pageStart + perPage)

  const paginationPages = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const list = [1]
    if (safePage > 3) list.push('ellipsis')
    const low = Math.max(2, safePage - 1)
    const high = Math.min(totalPages - 1, safePage + 1)
    for (let p = low; p <= high; p += 1) {
      if (!list.includes(p)) list.push(p)
    }
    if (safePage < totalPages - 2) list.push('ellipsis')
    if (totalPages > 1) list.push(totalPages)
    return list
  })()

  return (
    <div className="page-enter">
      <div className="card border-0 shadow-sm w-100">
        {/* Header – same style as MyDocuments */}
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
              <i className="fas fa-users" />
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
                User management
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
                View and manage all registered users across the system.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {/* Summary cards row – exactly like MyDocuments */}
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
                  onClick={() => {
                    setSummaryClosing(false)
                    setActiveSummaryModal('total')
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
                    <i className="fas fa-users" />
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
                      Total users
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
                      {total}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.8rem',
                      }}
                    >
                      All non-admin accounts in the system.
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
                  onClick={() => {
                    setSummaryClosing(false)
                    setActiveSummaryModal('active')
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
                    <i className="fas fa-user-check" />
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
                      Active
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
                      {active}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.8rem',
                      }}
                    >
                      Users currently allowed to sign in.
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
                  onClick={() => {
                    setSummaryClosing(false)
                    setActiveSummaryModal('inactive')
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
                    <i className="fas fa-user-times" />
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
                      Inactive
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
                      {inactive}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.8rem',
                      }}
                    >
                      Disabled or archived user accounts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter/search toolbar – copied from MyDocuments */}
          <div
            className="px-3 pt-3 pb-2 border-bottom"
            style={{
              backgroundColor: '#f9fafb',
            }}
          >
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label
                  htmlFor="um_status_filter"
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
                  id="um_status_filter"
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
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
                  <option value="all">All statuses</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
              <div className="col-12 col-md-8">
                <label
                  htmlFor="um_search"
                  className="form-label mb-1"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  Search users
                </label>
                <div className="d-flex gap-2">
                  <div className="position-relative flex-grow-1">
                  <input
                    id="um_search"
                    type="text"
                    className="form-control form-control-sm pe-5"
                    placeholder="Name, email, section, designation…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
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
                    {search.trim() && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="btn btn-sm btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-2"
                        onClick={() => {
                          setSearch('')
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
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                    style={{
                      whiteSpace: 'nowrap',
                      borderRadius: 4,
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '0.8rem',
                      borderColor: '#d1d5db',
                      color: '#374151',
                      paddingInline: '0.75rem',
                      gap: 6,
                    }}
                    onClick={() => {
                      setStatusFilter('all')
                      setSearch('')
                      setPage(1)
                    }}
                  >
                    <i className="fas fa-undo-alt" aria-hidden />
                    <span>Reset filters</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content – light cards */}
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div
                className="spinner-border"
                role="status"
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  color: '#0C8A3B',
                }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : pageItems.length === 0 ? (
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
                No matching users
              </h3>
              <p
                className="mb-0 mx-auto"
                style={{
                  fontFamily:
                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontSize: '0.9rem',
                  color: '#6b7280',
                  maxWidth: 360,
                }}
              >
                No users match the current search or filters. Try adjusting your criteria.
              </p>
            </div>
          ) : (
            <div className="px-3 py-3">
              <div className="row g-3">
                {pageItems.map((u) => {
                  const isInactive = u.is_active === false
                  const lastRemark = remarksByUserId[u.id]
                  return (
                    <div key={u.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                      <div
                        className="card h-100"
                        style={{
                          borderRadius: 12,
                          border: '1px solid #d1e2d6',
                          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
                          transition:
                            'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.10)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.borderColor = '#b5d3ba'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 10px rgba(15, 23, 42, 0.06)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = '#d1e2d6'
                        }}
                      >
                        {/* Corporate header strip */}
                        <div
                          className="px-3 py-2 d-flex align-items-center"
                          style={{
                            backgroundColor: '#f4fbf6',
                            borderBottom: '1px solid #e5e7eb',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                          }}
                        >
                          <span
                            className="badge"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              padding: '0.35rem 0.55rem',
                              borderRadius: 999,
                              backgroundColor: isInactive ? '#eef2f7' : '#e5f3ea',
                              color: isInactive ? '#475569' : '#0C8A3B',
                              border: `1px solid ${isInactive ? '#e2e8f0' : '#cfe7d6'}`,
                            }}
                          >
                            {isInactive ? 'Inactive' : 'Active'}
                          </span>
                        </div>

                        <div className="card-body d-flex flex-column p-3">
                          <div className="d-flex align-items-center mb-3 gap-3">
                            <div
                              className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                              style={{
                                width: 44,
                                height: 44,
                                minWidth: 44,
                                minHeight: 44,
                                backgroundColor: '#0C8A3B',
                                color: '#ffffff',
                                fontWeight: 700,
                                boxShadow: '0 6px 14px rgba(12, 138, 59, 0.20)',
                              }}
                            >
                              {initials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="fw-semibold text-truncate"
                                style={{
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontSize: '0.97rem',
                                  color: '#111827',
                                }}
                              >
                                {u.name}
                              </div>
                              <div
                                className="text-muted small text-truncate"
                                style={{
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontSize: '0.8rem',
                                }}
                              >
                                {u.email}
                              </div>
                            </div>
                          </div>
                          <div
                            className="small mb-2"
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.8rem',
                              color: '#4b5563',
                            }}
                          >
                            <div className="mb-1">
                              <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                                Section
                              </div>
                              <div className="fw-medium text-truncate" title={u.section_unit || ''}>
                                {u.section_unit || '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                                Designation
                              </div>
                              <div className="fw-medium text-truncate" title={u.designation_position || ''}>
                                {u.designation_position || '—'}
                              </div>
                            </div>
                            {(lastRemark?.remarks ?? u.deactivation_remarks) ? (
                              <div className="mt-2 pt-2" style={{ borderTop: '1px dashed #e5e7eb' }}>
                                <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                                  Last remarks
                                </div>
                                <div className="text-truncate" title={lastRemark?.remarks ?? u.deactivation_remarks}>
                                  {lastRemark?.remarks ?? u.deactivation_remarks}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Footer actions – single-line, responsive buttons */}
                          <div className="mt-auto pt-2">
                            <div className="d-flex flex-nowrap gap-2">
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center btn-outline-secondary flex-fill"
                                onClick={() => {
                                  setDetailsClosing(false)
                                  setDetailsUser(u)
                                }}
                                style={{
                                  borderRadius: 3,
                                  borderColor: '#d1d5db',
                                  backgroundColor: '#ffffff',
                                  color: '#374151',
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '0.78rem',
                                  padding: '0.35rem 0.4rem',
                                  minWidth: 0,
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
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center flex-fill"
                                onClick={() => openConfirm(isInactive ? 'activate' : 'deactivate', u)}
                                style={{
                                  borderRadius: 3,
                                  backgroundColor: isInactive ? '#0C8A3B' : '#f3f4f6',
                                  border: isInactive ? '1px solid #0C8A3B' : '1px solid #d1d5db',
                                  color: isInactive ? '#ffffff' : '#111827',
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '0.78rem',
                                  padding: '0.35rem 0.4rem',
                                  minWidth: 0,
                                  transition:
                                    'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (isInactive) {
                                    e.currentTarget.style.backgroundColor = '#0a6b2f'
                                    e.currentTarget.style.borderColor = '#0a6b2f'
                                  } else {
                                    e.currentTarget.style.backgroundColor = '#e5f3ea'
                                    e.currentTarget.style.borderColor = '#cfe7d6'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = isInactive ? '#0C8A3B' : '#f3f4f6'
                                  e.currentTarget.style.borderColor = isInactive ? '#0C8A3B' : '#d1d5db'
                                }}
                              >
                                <i
                                  className={`fas ${isInactive ? 'fa-toggle-on' : 'fa-toggle-off'} me-1 flex-shrink-0`}
                                  aria-hidden
                                />
                                <span className="text-truncate">
                                  {isInactive ? 'Activate' : 'Deactivate'}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center btn-outline-danger flex-fill"
                                onClick={() => openConfirm('delete', u)}
                                style={{
                                  borderRadius: 3,
                                  fontFamily:
                                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '0.78rem',
                                  padding: '0.35rem 0.4rem',
                                  minWidth: 0,
                                  borderColor: '#fca5a5',
                                  backgroundColor: '#ffffff',
                                  color: '#b91c1c',
                                  transition:
                                    'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fef2f2'
                                  e.currentTarget.style.borderColor = '#f87171'
                                  e.currentTarget.style.color = '#991b1b'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ffffff'
                                  e.currentTarget.style.borderColor = '#fca5a5'
                                  e.currentTarget.style.color = '#b91c1c'
                                }}
                              >
                                <i className="fas fa-trash-alt me-1 flex-shrink-0" aria-hidden />
                                <span className="text-truncate">Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {filtered.length > 0 && !loading && (
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
                Showing {pageStart + 1}–
                {Math.min(pageStart + pageItems.length, filtered.length)} of {filtered.length}
              </span>
              <label className="d-flex align-items-center gap-1 mb-0">
                <span className="text-muted small">Per page</span>
                <select
                  className="travel-orders-per-page-select form-select form-select-sm"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  aria-label="Items per page"
                >
                  {[8, 12, 24, 48].map((n) => (
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
                    className={`travel-orders-pagination-btn travel-orders-pagination-btn-num ${
                      safePage === p ? 'active' : ''
                    }`}
                    disabled={safePage === p}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={safePage === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ),
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

      {activeSummaryModal && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-summary-modal-title"
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
                    id="um-summary-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    {activeSummaryModal === 'total' && 'Total users'}
                    {activeSummaryModal === 'active' && 'Active users'}
                    {activeSummaryModal === 'inactive' && 'Inactive users'}
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
                  {activeSummaryModal === 'total' && total}
                  {activeSummaryModal === 'active' && active}
                  {activeSummaryModal === 'inactive' && inactive}
                </div>
                <div
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                  }}
                >
                  {activeSummaryModal === 'total' && 'Total user accounts'}
                  {activeSummaryModal === 'active' && 'Users currently active'}
                  {activeSummaryModal === 'inactive' && 'Users currently inactive'}
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

      {detailsUser && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-details-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                detailsClosing ? ' exit' : ''
              }`}
              onClick={() => {
                setDetailsClosing(true)
                setTimeout(() => {
                  setDetailsClosing(false)
                  setDetailsUser(null)
                }, 200)
              }}
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
                    id="um-details-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    Account details
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
                    Review profile information and recent admin remarks.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    setDetailsClosing(true)
                    setTimeout(() => {
                      setDetailsClosing(false)
                      setDetailsUser(null)
                    }, 200)
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 48,
                      height: 48,
                      minWidth: 48,
                      minHeight: 48,
                      backgroundColor: '#0C8A3B',
                      color: '#ffffff',
                      fontWeight: 700,
                      boxShadow: '0 8px 18px rgba(12, 138, 59, 0.22)',
                    }}
                  >
                    {initials(detailsUser.name)}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="fw-semibold text-truncate"
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '1.05rem',
                        color: '#111827',
                      }}
                    >
                      {detailsUser.name}
                    </div>
                    <div
                      className="text-muted text-truncate"
                      style={{
                        fontFamily:
                          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                        fontSize: '0.9rem',
                      }}
                    >
                      {detailsUser.email}
                    </div>
                  </div>
                </div>

                <div
                  className="p-3 rounded-3"
                  style={{
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                        Status
                      </div>
                      <div className="fw-semibold">
                        {detailsUser.is_active === false ? 'Inactive' : 'Active'}
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                        Role
                      </div>
                      <div className="fw-semibold">{detailsUser.role || 'user'}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                        Section
                      </div>
                      <div className="fw-semibold">{detailsUser.section_unit || '—'}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                        Designation
                      </div>
                      <div className="fw-semibold">{detailsUser.designation_position || '—'}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                        Last updated
                      </div>
                      <div className="fw-semibold">
                        {detailsUser.updated_at
                          ? (() => {
                              try {
                                const d = new Date(detailsUser.updated_at)
                                return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                              } catch {
                                return '—'
                              }
                            })()
                          : '—'}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                        Last remarks
                      </div>
                      {(remarksByUserId[detailsUser.id]?.remarks ?? detailsUser.deactivation_remarks) ? (
                        <div className="fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                          {remarksByUserId[detailsUser.id]?.remarks ?? detailsUser.deactivation_remarks}
                        </div>
                      ) : (
                        <div className="text-muted">No remarks recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={() => {
                    setDetailsClosing(true)
                    setTimeout(() => {
                      setDetailsClosing(false)
                      setDetailsUser(null)
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

      {confirmAction && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-confirm-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                confirmClosing ? ' exit' : ''
              }`}
              onClick={() => {
                setConfirmClosing(true)
                setTimeout(() => {
                  setConfirmClosing(false)
                  setConfirmAction(null)
                }, 200)
              }}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${
                confirmClosing ? ' exit' : ''
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
                    id="um-confirm-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    {confirmAction.type === 'activate' && 'Confirm activation'}
                    {confirmAction.type === 'deactivate' && 'Confirm deactivation'}
                    {confirmAction.type === 'delete' && 'Confirm deletion'}
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
                    {confirmAction.type === 'activate' &&
                      'Activate this account so the user can sign in.'}
                    {confirmAction.type === 'deactivate' &&
                      'Deactivate this account to prevent the user from signing in.'}
                    {confirmAction.type === 'delete' &&
                      'This will permanently delete the account. This action cannot be undone.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    setConfirmClosing(true)
                    setTimeout(() => {
                      setConfirmClosing(false)
                      setConfirmAction(null)
                    }, 200)
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '1.25rem 1.5rem 1.25rem' }}>
                <div className="mb-3">
                  <div
                    className="fw-semibold"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      color: '#111827',
                    }}
                  >
                    {confirmAction.user?.name}
                  </div>
                  <div className="text-muted small">{confirmAction.user?.email}</div>
                </div>

                <label
                  htmlFor="um-remarks"
                  className="form-label mb-1"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  Remarks (optional)
                </label>
                <textarea
                  id="um-remarks"
                  className="form-control"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    confirmAction.type === 'delete'
                      ? 'Reason for deletion...'
                      : confirmAction.type === 'deactivate'
                        ? 'Reason for deactivation...'
                        : 'Optional notes...'
                  }
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontSize: '0.9rem',
                    borderColor: '#d1e2d6',
                    borderRadius: 10,
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
              </div>

              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  disabled={confirmSubmitting}
                  onClick={() => {
                    setConfirmClosing(true)
                    setTimeout(() => {
                      setConfirmClosing(false)
                      setConfirmAction(null)
                    }, 200)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${
                    confirmAction.type === 'delete' ? 'btn-danger' : 'btn-success'
                  }`}
                  onClick={submitConfirm}
                  disabled={confirmSubmitting}
                  style={{
                    borderRadius: 10,
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {confirmSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {confirmAction.type === 'activate' && (confirmSubmitting ? 'Activating…' : 'Activate')}
                    {confirmAction.type === 'deactivate' &&
                      (confirmSubmitting ? 'Deactivating…' : 'Deactivate')}
                    {confirmAction.type === 'delete' && (confirmSubmitting ? 'Deleting…' : 'Delete')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { documentService } from '../services/documentService'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import Portal from '../components/Portal.jsx'

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

// Shared with My Documents for consistency
const headerBg = '#d3e9d7'
const headerBorder = '1px solid #b5d3ba'
const iconBg = '#0C8A3B'
const titleColor = '#1f2933'
const subtitleColor = '#6b7280'
const cardBorder = '1px solid #d1e2d6'
const sectionBg = '#f4fbf6'
const toolbarBg = '#f9fafb'
const primaryGreen = '#0C8A3B'
const primaryGreenHover = '#0A6B2E'
const accentAmber = '#b45309'
const accentAmberHover = '#924204'
const emptyIconBg = '#e5f3ea'

export default function TrackByControlNumber() {
  const { user } = useAuth()
  const location = useLocation()
  const initialControlNumber = location.state?.controlNumber || ''
  const [controlNumber, setControlNumber] = useState(initialControlNumber)
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inOutLoading, setInOutLoading] = useState(null)
  const [outModal, setOutModal] = useState(false)
  const [inModal, setInModal] = useState(false)
  const [outRemarks, setOutRemarks] = useState('')
  const [inRemarks, setInRemarks] = useState('')
  const [inDetails, setInDetails] = useState({})
  const [outClosing, setOutClosing] = useState(false)
  const [inClosing, setInClosing] = useState(false)

  useEffect(() => {
    if (initialControlNumber) {
      setControlNumber(initialControlNumber)
      setLoading(true)
      documentService
        .getDocumentByControlNumber(initialControlNumber)
        .then(setDoc)
        .catch(() => setDoc(null))
        .finally(() => setLoading(false))
    }
  }, [initialControlNumber])

  const currentUserId = user?.id

  const handleSearch = async (e) => {
    e?.preventDefault()
    const cn = controlNumber.trim()
    if (!cn) {
      toast.info('Enter a control number')
      return
    }
    setLoading(true)
    setDoc(null)
    try {
      const data = await documentService.getDocumentByControlNumber(cn)
      setDoc(data)
    } catch (err) {
      toast.error(err?.message || 'Document not found')
      setDoc(null)
    } finally {
      setLoading(false)
    }
  }

  const closeOutModal = () => {
    setOutClosing(true)
    setTimeout(() => {
      setOutClosing(false)
      setOutModal(false)
    }, 200)
  }

  const closeInModal = () => {
    setInClosing(true)
    setTimeout(() => {
      setInClosing(false)
      setInModal(false)
    }, 200)
  }

  const handleOut = async () => {
    if (!doc?.id) return
    setInOutLoading('out')
    try {
      const updated = await documentService.recordOut(doc.id, { remarks: outRemarks })
      setDoc(updated)
      setOutRemarks('')
      closeOutModal()
      toast.success('Out recorded')
    } catch (err) {
      toast.error(err?.message || 'Failed to record Out')
    } finally {
      setInOutLoading(null)
    }
  }

  const handleIn = async () => {
    if (!doc?.id) return
    const hasRemarks = (inRemarks || '').trim() !== ''
    const hasDetails =
      inDetails &&
      Object.values(inDetails).some((v) => v != null && String(v).trim() !== '')
    if (!hasRemarks && !hasDetails) {
      toast.info(
        'Please provide registration details (e.g. date received) or remarks when recording In.'
      )
      return
    }
    setInOutLoading('in')
    try {
      const updated = await documentService.recordIn(doc.id, {
        remarks: inRemarks,
        registration_details: inDetails,
      })
      setDoc(updated)
      setInRemarks('')
      setInDetails({})
      closeInModal()
      toast.success('In recorded')
    } catch (err) {
      toast.error(err?.message || 'Failed to record In')
    } finally {
      setInOutLoading(null)
    }
  }

  const hasLogEntries =
    Array.isArray(doc?.logbook_entries) && doc.logbook_entries.length > 0
  const isAdmin = user?.role === 'admin'
  const canOut =
    !isAdmin &&
    doc &&
    ((doc.current_holder_user_id != null &&
      doc.current_holder_user_id === currentUserId) ||
      (doc.current_holder_user_id == null &&
        doc.created_by_user_id === currentUserId &&
        !hasLogEntries))
  const canIn =
    !isAdmin &&
    doc &&
    !doc.current_holder_user_id &&
    (doc.created_by_user_id !== currentUserId || hasLogEntries)

  const statusLabel = (status) => {
    if (status === 'in_transit') return 'Released'
    if (status === 'with_personnel') return 'Received'
    return status
  }

  const primaryBtnBase = {
    borderRadius: 6,
    backgroundColor: primaryGreen,
    borderColor: primaryGreen,
    color: '#ffffff',
    fontFamily: interFamily,
    fontWeight: 500,
    fontSize: '0.9rem',
    paddingInline: '1rem',
    transition:
      'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
  }

  return (
    <div className="page-enter">
      <div className="card border-0 shadow-sm w-100">
        {/* Page header – same as My Documents */}
        <div
          className="card-header border-0"
          style={{
            backgroundColor: headerBg,
            borderBottom: headerBorder,
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
                backgroundColor: iconBg,
                color: '#ffffff',
              }}
            >
              <i className="fas fa-search" />
            </div>
            <div>
              <h2
                className="mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: titleColor,
                }}
              >
                Document tracking
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.85rem',
                  color: subtitleColor,
                }}
              >
                Search by control number to review status and view the official document logbook.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {/* Search section – same band style as My Documents summary/filter */}
          <div
            className="px-3 pt-3 pb-3 border-bottom"
            style={{ backgroundColor: sectionBg }}
          >
            <form onSubmit={handleSearch} className="row g-2 align-items-end">
              <div className="col-12 col-md-6 col-lg-5">
                <label
                  htmlFor="track-controlNumber"
                  className="form-label mb-1"
                  style={{
                    fontFamily: interFamily,
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: '#374151',
                  }}
                >
                  Control number
                </label>
                <div className="position-relative">
                  <input
                    id="track-controlNumber"
                    type="text"
                    className="form-control form-control-sm pe-5"
                    placeholder="e.g. PR-2025-001"
                    value={controlNumber}
                    onChange={(e) => setControlNumber(e.target.value)}
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.85rem',
                      borderColor: '#d1e2d6',
                      borderRadius: 6,
                      transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = primaryGreen
                      e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1e2d6'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  {controlNumber.trim() && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      className="btn btn-sm btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-2"
                      onClick={() => {
                        setControlNumber('')
                        setDoc(null)
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
              <div className="col-12 col-md-6 col-lg-4">
                <button
                  type="submit"
                  className="btn btn-sm"
                  style={{
                    ...primaryBtnBase,
                    minWidth: 120,
                  }}
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = primaryGreenHover
                      e.currentTarget.style.borderColor = primaryGreenHover
                      e.currentTarget.style.boxShadow =
                        '0 2px 6px rgba(12, 138, 59, 0.35)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = primaryGreen
                    e.currentTarget.style.borderColor = primaryGreen
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : (
                    <i className="fas fa-search me-1" />
                  )}
                  Search
                </button>
              </div>
            </form>
          </div>

          {loading && (
            <div
              className="d-flex flex-column align-items-center justify-content-center py-5"
              style={{ backgroundColor: toolbarBg }}
            >
              <div
                className="spinner-border"
                role="status"
                style={{ width: '1.75rem', height: '1.75rem', color: primaryGreen }}
              />
              <p
                className="mt-3 mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.9rem',
                  color: subtitleColor,
                }}
              >
                Searching for document…
              </p>
            </div>
          )}

          {!loading && doc && (
            <>
              {/* Document summary card – same card style as My Documents */}
              <div className="px-3 pt-3 pb-2">
                <div
                  className="rounded-3 overflow-hidden"
                  style={{
                    backgroundColor: '#ffffff',
                    border: cardBorder,
                    transition:
                      'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 6px 18px rgba(15, 118, 110, 0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: headerBg,
                      borderBottom: headerBorder,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: interFamily,
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: titleColor,
                        }}
                      >
                        {doc.control_number}
                      </span>
                      {doc.document_type && (
                        <span
                          className="ms-2"
                          style={{
                            fontFamily: interFamily,
                            fontSize: '0.9rem',
                            color: subtitleColor,
                          }}
                        >
                          ({doc.document_type?.name || doc.document_type})
                        </span>
                      )}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {!isAdmin && (
                        <Link
                          to="/documents"
                          className="btn btn-sm btn-light"
                          style={{
                            fontFamily: interFamily,
                            borderRadius: 6,
                            borderColor: '#d1e2d6',
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            transition:
                              'background-color 0.15s ease, border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e5f3ea'
                            e.currentTarget.style.borderColor = '#b5d3ba'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                            e.currentTarget.style.borderColor = '#d1e2d6'
                          }}
                        >
                          <i className="fas fa-arrow-left me-1" />
                          My documents
                        </Link>
                      )}
                      {canOut && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            ...primaryBtnBase,
                            backgroundColor: accentAmber,
                            borderColor: accentAmber,
                          }}
                          onClick={() => {
                            setOutRemarks('')
                            setOutModal(true)
                          }}
                          disabled={!!inOutLoading}
                          onMouseEnter={(e) => {
                            if (!inOutLoading) {
                              e.currentTarget.style.backgroundColor = accentAmberHover
                              e.currentTarget.style.borderColor = accentAmberHover
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = accentAmber
                            e.currentTarget.style.borderColor = accentAmber
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          {inOutLoading === 'out' ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <>
                              <i className="fas fa-sign-out-alt me-1" />
                              Record Out
                            </>
                          )}
                        </button>
                      )}
                      {canIn && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={primaryBtnBase}
                          onClick={() => setInModal(true)}
                          disabled={!!inOutLoading}
                          onMouseEnter={(e) => {
                            if (!inOutLoading) {
                              e.currentTarget.style.backgroundColor = primaryGreenHover
                              e.currentTarget.style.borderColor = primaryGreenHover
                              e.currentTarget.style.boxShadow =
                                '0 2px 6px rgba(12, 138, 59, 0.35)'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = primaryGreen
                            e.currentTarget.style.borderColor = primaryGreen
                            e.currentTarget.style.boxShadow = 'none'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          {inOutLoading === 'in' ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <>
                              <i className="fas fa-sign-in-alt me-1" />
                              Record In
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="p-3 border-top"
                    style={{ borderColor: '#d1e2d6', backgroundColor: '#ffffff' }}
                  >
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <span
                          style={{
                            fontFamily: interFamily,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: subtitleColor,
                            marginBottom: 4,
                            display: 'block',
                          }}
                        >
                          Status
                        </span>
                        <div
                          style={{
                            fontFamily: interFamily,
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: '#111827',
                          }}
                        >
                          {statusLabel(doc.status)}
                        </div>
                      </div>
                      {doc.current_holder && (
                        <div className="col-12 col-md-4">
                          <span
                            style={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: subtitleColor,
                              marginBottom: 4,
                              display: 'block',
                            }}
                          >
                            Current holder
                          </span>
                          <div
                            style={{
                              fontFamily: interFamily,
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              color: '#111827',
                            }}
                          >
                            {doc.current_holder.name}
                            {doc.current_holder.section_unit && (
                              <span
                                style={{
                                  fontFamily: interFamily,
                                  fontWeight: 400,
                                  fontSize: '0.85rem',
                                  color: subtitleColor,
                                }}
                              >
                                {` (${doc.current_holder.section_unit}${
                                  doc.current_holder.designation_position
                                    ? ` — ${doc.current_holder.designation_position}`
                                    : ''
                                })`}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {doc.created_by && (
                        <div className="col-12 col-md-4">
                          <span
                            style={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: subtitleColor,
                              marginBottom: 4,
                              display: 'block',
                            }}
                          >
                            Created by
                          </span>
                          <div
                            style={{
                              fontFamily: interFamily,
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              color: '#111827',
                            }}
                          >
                            {doc.created_by.name}
                            {(doc.created_by.section_unit ||
                              doc.created_by.designation_position) && (
                              <span
                                style={{
                                  fontFamily: interFamily,
                                  fontWeight: 400,
                                  fontSize: '0.85rem',
                                  color: subtitleColor,
                                }}
                              >
                                {` (${
                                  doc.created_by.section_unit || 'No section/unit'
                                }${
                                  doc.created_by.designation_position
                                    ? ` — ${doc.created_by.designation_position}`
                                    : ''
                                })`}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital logbook – table style aligned with My Documents */}
              <div className="px-3 pt-2 pb-3">
                <div
                  className="rounded-3 overflow-hidden"
                  style={{
                    backgroundColor: '#ffffff',
                    border: cardBorder,
                  }}
                >
                  <div
                    className="px-3 py-2"
                    style={{
                      backgroundColor: toolbarBg,
                      borderBottom: '1px solid #e5e7eb',
                      fontFamily: interFamily,
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: titleColor,
                    }}
                  >
                    Document log
                  </div>
                  {doc.logbook_entries && doc.logbook_entries.length > 0 ? (
                    <>
                      {/* Desktop / tablet table view */}
                      <div className="table-responsive d-none d-md-block">
                      <table
                        className="table table-hover mb-0 align-middle"
                        style={{
                          fontFamily: interFamily,
                          minWidth: 760,
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              className="text-uppercase text-center"
                              style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.06em',
                                color: subtitleColor,
                                fontWeight: 600,
                                borderColor: '#e5e7eb',
                                backgroundColor: '#f3f4f6',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              Action
                            </th>
                            <th
                              className="text-uppercase"
                              style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.06em',
                                color: subtitleColor,
                                fontWeight: 600,
                                borderColor: '#e5e7eb',
                                backgroundColor: '#f3f4f6',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              User
                            </th>
                            <th
                              className="text-uppercase"
                              style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.06em',
                                color: subtitleColor,
                                fontWeight: 600,
                                borderColor: '#e5e7eb',
                                backgroundColor: '#f3f4f6',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              Section &amp; Unit
                            </th>
                            <th
                              className="text-uppercase"
                              style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.06em',
                                color: subtitleColor,
                                fontWeight: 600,
                                borderColor: '#e5e7eb',
                                backgroundColor: '#f3f4f6',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              Designation / Position
                            </th>
                            <th
                              className="text-uppercase"
                              style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.06em',
                                color: subtitleColor,
                                fontWeight: 600,
                                borderColor: '#e5e7eb',
                                backgroundColor: '#f3f4f6',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              Date &amp; time
                            </th>
                            <th
                              className="text-uppercase"
                              style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.06em',
                                color: subtitleColor,
                                fontWeight: 600,
                                borderColor: '#e5e7eb',
                                backgroundColor: '#f3f4f6',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              Remarks
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.logbook_entries.map((entry, index) => (
                            <tr
                              key={entry.id}
                              style={{
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                              }}
                            >
                              <td
                                style={{
                                  borderColor: '#e5e7eb',
                                  padding: '0.55rem 0.75rem',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span
                                  className="badge text-uppercase"
                                  style={{
                                    fontFamily: interFamily,
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.04em',
                                    ...(entry.action === 'in'
                                      ? {
                                          backgroundColor: '#d1e2d6',
                                          color: primaryGreen,
                                        }
                                      : {
                                          backgroundColor: '#fef3c7',
                                          color: accentAmber,
                                        }),
                                  }}
                                >
                                  {entry.action === 'in' ? 'In' : 'Out'}
                                </span>
                              </td>
                              <td
                                style={{
                                  borderColor: '#e5e7eb',
                                  padding: '0.55rem 0.75rem',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#111827',
                                  }}
                                >
                                  {entry.user?.name || entry.user?.email || '—'}
                                </div>
                              </td>
                              <td
                                style={{
                                  borderColor: '#e5e7eb',
                                  padding: '0.55rem 0.75rem',
                                  fontSize: '0.85rem',
                                  color: '#374151',
                                }}
                              >
                                {entry.user?.section_unit || '—'}
                              </td>
                              <td
                                style={{
                                  borderColor: '#e5e7eb',
                                  padding: '0.55rem 0.75rem',
                                  fontSize: '0.85rem',
                                  color: '#374151',
                                }}
                              >
                                {entry.user?.designation_position || '—'}
                              </td>
                              <td
                                style={{
                                  borderColor: '#e5e7eb',
                                  padding: '0.55rem 0.75rem',
                                  fontSize: '0.85rem',
                                  whiteSpace: 'nowrap',
                                  color: '#111827',
                                }}
                              >
                                {entry.moved_at
                                  ? new Date(entry.moved_at).toLocaleString()
                                  : '—'}
                              </td>
                              <td
                                style={{
                                  borderColor: '#e5e7eb',
                                  padding: '0.55rem 0.75rem',
                                  fontSize: '0.85rem',
                                  color: '#4b5563',
                                }}
                              >
                                {entry.remarks || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>

                      {/* Mobile card view */}
                      <div className="d-block d-md-none">
                        {doc.logbook_entries.map((entry, index) => (
                          <div
                            key={entry.id}
                            className="border-bottom"
                            style={{
                              padding: '0.75rem 0.9rem',
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                              borderColor: '#e5e7eb',
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span
                                className="badge text-uppercase"
                                style={{
                                  fontFamily: interFamily,
                                  fontSize: '0.7rem',
                                  letterSpacing: '0.04em',
                                  ...(entry.action === 'in'
                                    ? {
                                        backgroundColor: '#d1e2d6',
                                        color: primaryGreen,
                                      }
                                    : {
                                        backgroundColor: '#fef3c7',
                                        color: accentAmber,
                                      }),
                                }}
                              >
                                {entry.action === 'in' ? 'In' : 'Out'}
                              </span>
                              <span
                                style={{
                                  fontFamily: interFamily,
                                  fontSize: '0.75rem',
                                  color: subtitleColor,
                                }}
                              >
                                {entry.moved_at
                                  ? new Date(entry.moved_at).toLocaleString()
                                  : '—'}
                              </span>
                            </div>
                            <div
                              style={{
                                fontFamily: interFamily,
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#111827',
                                marginBottom: 2,
                              }}
                            >
                              {entry.user?.name || entry.user?.email || '—'}
                            </div>
                            <div
                              style={{
                                fontFamily: interFamily,
                                fontSize: '0.8rem',
                                color: '#374151',
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    fontWeight: 600,
                                    color: subtitleColor,
                                  }}
                                >
                                  Section &amp; Unit:{' '}
                                </span>
                                <span>{entry.user?.section_unit || '—'}</span>
                              </div>
                              <div>
                                <span
                                  style={{
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    fontWeight: 600,
                                    color: subtitleColor,
                                  }}
                                >
                                  Designation / Position:{' '}
                                </span>
                                <span>{entry.user?.designation_position || '—'}</span>
                              </div>
                              <div>
                                <span
                                  style={{
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    fontWeight: 600,
                                    color: subtitleColor,
                                  }}
                                >
                                  Remarks:{' '}
                                </span>
                                <span>{entry.remarks || '—'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div
                      className="p-4 text-center"
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.9rem',
                        color: subtitleColor,
                        backgroundColor: '#f8faf9',
                        borderTop: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: emptyIconBg,
                          color: primaryGreen,
                        }}
                      >
                        <i className="fas fa-book-open" style={{ fontSize: '1rem' }} />
                      </div>
                      <div>No logbook entries yet.</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!loading && !doc && controlNumber.trim() !== '' && (
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
                  backgroundColor: emptyIconBg,
                  color: primaryGreen,
                }}
              >
                <i className="fas fa-search" style={{ fontSize: '1.1rem' }} />
              </div>
              <h3
                className="mb-2"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#1f2937',
                }}
              >
                Document not found
              </h3>
              <p
                className="mb-0 mx-auto"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.9rem',
                  color: subtitleColor,
                  maxWidth: 360,
                }}
              >
                No document matches this control number. Check the number and try again, or register a new control number from My documents.
              </p>
            </div>
          )}

          {!loading && !doc && controlNumber.trim() === '' && (
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
                  backgroundColor: emptyIconBg,
                  color: primaryGreen,
                }}
              >
                <i className="fas fa-search" style={{ fontSize: '1.1rem' }} />
              </div>
              <h3
                className="mb-2"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#1f2937',
                }}
              >
                Enter a control number
              </h3>
              <p
                className="mb-0 mx-auto"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.9rem',
                  color: subtitleColor,
                  maxWidth: 360,
                }}
              >
                Use the search field above to look up a document by its control number. You can also open a document from My documents.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Out modal */}
      {outModal && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-out-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${outClosing ? ' exit' : ''}`}
              onClick={closeOutModal}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${outClosing ? ' exit' : ''}`}
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
                  backgroundColor: toolbarBg,
                }}
              >
                <h5
                  id="track-out-modal-title"
                  className="mb-0"
                  style={{
                    fontFamily: interFamily,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#111827',
                  }}
                >
                  Record Out
                </h5>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={closeOutModal}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="account-approvals-detail-body">
                <label
                  htmlFor="track-outRemarks"
                  className="form-label"
                  style={{ fontFamily: interFamily, fontWeight: 500 }}
                >
                  Remarks (optional)
                </label>
                <input
                  id="track-outRemarks"
                  className="form-control"
                  value={outRemarks}
                  onChange={(e) => setOutRemarks(e.target.value)}
                  placeholder="Remarks"
                  style={{
                    fontFamily: interFamily,
                    borderRadius: 6,
                    borderColor: '#d1e2d6',
                  }}
                />
              </div>
              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={closeOutModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    ...primaryBtnBase,
                    backgroundColor: accentAmber,
                    borderColor: accentAmber,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onClick={handleOut}
                  disabled={inOutLoading === 'out'}
                  onMouseEnter={(e) => {
                    if (inOutLoading !== 'out') {
                      e.currentTarget.style.backgroundColor = accentAmberHover
                      e.currentTarget.style.borderColor = accentAmberHover
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = accentAmber
                    e.currentTarget.style.borderColor = accentAmber
                  }}
                >
                  {inOutLoading === 'out' ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      <span>Recording Out…</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-out-alt me-1" />
                      <span>Record Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* In modal */}
      {inModal && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-in-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${inClosing ? ' exit' : ''}`}
              onClick={closeInModal}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${inClosing ? ' exit' : ''}`}
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
                  backgroundColor: toolbarBg,
                }}
              >
                <h5
                  id="track-in-modal-title"
                  className="mb-0"
                  style={{
                    fontFamily: interFamily,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#111827',
                  }}
                >
                  Record In — Registration details
                </h5>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={closeInModal}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="account-approvals-detail-body">
                <div className="mb-3">
                  <label className="form-label" style={{ fontFamily: interFamily, fontWeight: 500 }}>
                    Remarks (optional)
                  </label>
                  <input
                    className="form-control"
                    value={inRemarks}
                    onChange={(e) => setInRemarks(e.target.value)}
                    placeholder="Remarks"
                    style={{
                      fontFamily: interFamily,
                      borderRadius: 6,
                      borderColor: '#d1e2d6',
                    }}
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label" style={{ fontFamily: interFamily, fontWeight: 500 }}>
                    Date received (optional)
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={inDetails.date_received || ''}
                    onChange={(e) =>
                      setInDetails((d) => ({ ...d, date_received: e.target.value }))
                    }
                    style={{
                      fontFamily: interFamily,
                      borderRadius: 6,
                      borderColor: '#d1e2d6',
                    }}
                  />
                </div>
              </div>
              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={closeInModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    ...primaryBtnBase,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onClick={handleIn}
                  disabled={inOutLoading === 'in'}
                  onMouseEnter={(e) => {
                    if (inOutLoading !== 'in') {
                      e.currentTarget.style.backgroundColor = primaryGreenHover
                      e.currentTarget.style.borderColor = primaryGreenHover
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = primaryGreen
                    e.currentTarget.style.borderColor = primaryGreen
                  }}
                >
                  {inOutLoading === 'in' ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      <span>Recording In…</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt me-1" />
                      <span>Record In</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

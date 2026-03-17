import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { documentService } from '../../services/documentService'
import { toast } from 'react-toastify'
import Portal from '../../components/Portal.jsx'

export default function DocumentTypes() {
  const { user } = useAuth()
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createClosing, setCreateClosing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editClosing, setEditClosing] = useState(false)
  const [form, setForm] = useState({ name: '', is_active: true })
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', is_active: true })

  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const load = () => {
    setLoading(true)
    documentService
      .getDocumentTypesAll()
      .then(setTypes)
      .catch(() => setTypes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true))
      return () => cancelAnimationFrame(id)
    }
    setShowContent(false)
  }, [loading])

  const closeCreateModal = () => {
    setCreateClosing(true)
    setTimeout(() => {
      setCreateClosing(false)
      setShowCreateModal(false)
      setForm({ name: '', is_active: true })
    }, 200)
  }

  const closeEditModal = () => {
    setEditClosing(true)
    setTimeout(() => {
      setEditClosing(false)
      setShowEditModal(false)
      setEditingId(null)
      setEditForm({ name: '', is_active: true })
    }, 200)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.info('Enter a name')
      return
    }
    setSubmitting(true)
    try {
      await documentService.createDocumentType({
        name: form.name.trim(),
        is_active: form.is_active,
      })
      load()
      toast.success('Document type created')
      closeCreateModal()
    } catch (err) {
      toast.error(err?.message || 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (type) => {
    setSubmitting(true)
    try {
      await documentService.updateDocumentType(type.id, {
        name: editForm.name.trim(),
        is_active: editForm.is_active,
      })
      closeEditModal()
      load()
      toast.success('Document type updated')
    } catch (err) {
      toast.error(err?.message || 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (type) => {
    setEditingId(type.id)
    setEditForm({
      name: type.name || '',
      is_active: type.is_active !== false,
    })
    setEditClosing(false)
    setShowEditModal(true)
  }

  const primaryActionButtonStyle = {
    borderRadius: 6,
    backgroundColor: '#0C8A3B',
    borderColor: '#0C8A3B',
    color: '#ffffff',
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontWeight: 500,
    fontSize: '0.8rem',
    paddingInline: '0.75rem',
    transition:
      'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
  }

  const secondaryButtonStyle = {
    borderRadius: 6,
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontWeight: 500,
    fontSize: '0.8rem',
    borderColor: '#d1d5db',
    color: '#4b5563',
    backgroundColor: '#f9fafb',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  }

  if (loading) {
    return (
      <div className="page-enter">
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
                <i className="fas fa-list-alt" />
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
                  Document types
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
                  Loading configuration for agency document classifications&hellip;
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
                Please wait while we load document types.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
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
              <i className="fas fa-list-alt" />
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
                Document type registry
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
                Maintain the reference registry of document types used across the agency.
              </p>
            </div>
            <div className="mt-3 mt-md-0 ms-md-auto">
              <button
                type="button"
                className="btn btn-sm"
                style={primaryActionButtonStyle}
                onClick={() => {
                  setCreateClosing(false)
                  setShowCreateModal(true)
                }}
              >
                <i className="fas fa-plus-circle me-1" />
                Add document type
              </button>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {types.length === 0 ? (
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
                <i className="fas fa-list-ul" style={{ fontSize: '1.1rem' }} />
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
                No document types yet
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
                Use the "Add document type" button above to create the initial list of document
                classifications.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table
                className="table table-hover mb-0 align-middle"
                style={{
                  minWidth: 640,
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: '2.5rem' }}>#</th>
                    <th style={{ width: '7rem' }}>Actions</th>
                    <th>Name</th>
                    <th style={{ width: '6rem' }}>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t, index) => {
                    const rowNumber = index + 1
                    const truncateStyle = {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      display: 'block',
                    }
                    return (
                      <tr key={t.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{rowNumber}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={primaryActionButtonStyle}
                            onClick={() => startEdit(t)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#0A6B2E'
                              e.currentTarget.style.borderColor = '#0A6B2E'
                              e.currentTarget.style.boxShadow =
                                '0 2px 6px rgba(12, 138, 59, 0.35)'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#0C8A3B'
                              e.currentTarget.style.borderColor = '#0C8A3B'
                              e.currentTarget.style.boxShadow = 'none'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            Edit
                          </button>
                        </td>
                        <td style={{ overflow: 'hidden' }} title={t.name || ''}>
                          <span
                            style={{
                              fontFamily:
                                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                              fontSize: '0.9rem',
                              ...truncateStyle,
                            }}
                          >
                            {t.name}
                          </span>
                        </td>
                        <td>
                          {t.is_active !== false ? (
                            <span className="text-success">Yes</span>
                          ) : (
                            <span className="text-danger">No</span>
                          )}
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

      {showCreateModal && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-types-create-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                createClosing ? ' exit' : ''
              }`}
              onClick={() => {
                if (submitting) return
                closeCreateModal()
              }}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${
                createClosing ? ' exit' : ''
              }`}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 520,
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
                    id="document-types-create-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    Add document type
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
                    Add a new document type for use in the system.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    if (submitting) return
                    closeCreateModal()
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div
                  style={{
                    padding: '1.25rem 1.5rem 1rem',
                    overflowY: 'auto',
                    maxHeight: 'calc(90vh - 110px)',
                  }}
                >
                  <div className="mb-3">
                    <label className="form-label mb-1 small">Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Enter document type name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-1">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="createActive"
                        checked={form.is_active}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, is_active: e.target.checked }))
                        }
                      />
                      <label className="form-check-label small" htmlFor="createActive">
                        Active
                      </label>
                    </div>
                  </div>
                </div>
                <div className="account-approvals-detail-footer">
                  <button
                    type="button"
                    className="btn btn-light account-approvals-detail-close-btn"
                    onClick={() => {
                      if (submitting) return
                      closeCreateModal()
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={submitting}
                    style={{
                      minWidth: 120,
                      ...primaryActionButtonStyle,
                    }}
                    onMouseEnter={(e) => {
                      if (submitting) return
                      e.currentTarget.style.backgroundColor = '#0A6B2E'
                      e.currentTarget.style.borderColor = '#0A6B2E'
                    }}
                    onMouseLeave={(e) => {
                      if (submitting) return
                      e.currentTarget.style.backgroundColor = '#0C8A3B'
                      e.currentTarget.style.borderColor = '#0C8A3B'
                    }}
                  >
                    {submitting ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <>
                        <i className="fas fa-save me-1" />
                        Save type
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {showEditModal && editingId && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-types-edit-modal-title"
            tabIndex={-1}
          >
            <div
              className={`account-approvals-detail-backdrop modal-backdrop-animation${
                editClosing ? ' exit' : ''
              }`}
              onClick={() => {
                if (submitting) return
                closeEditModal()
              }}
              aria-hidden
            />
            <div
              className={`account-approvals-detail-modal modal-content-animation${
                editClosing ? ' exit' : ''
              }`}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 520,
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
                    id="document-types-edit-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    Edit document type
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
                    Update the name and status of this document type.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    if (submitting) return
                    closeEditModal()
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const current = types.find((t) => t.id === editingId)
                  if (!current) {
                    closeEditModal()
                    return
                  }
                  if (!editForm.name.trim()) {
                    toast.info('Enter a name')
                    return
                  }
                  handleUpdate(current)
                }}
              >
                <div
                  style={{
                    padding: '1.25rem 1.5rem 1rem',
                    overflowY: 'auto',
                    maxHeight: 'calc(90vh - 110px)',
                  }}
                >
                  <div className="mb-3">
                    <label className="form-label mb-1 small">Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder='e.g. "Purchase Request (PR)"'
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-1">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="editActive"
                        checked={editForm.is_active}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            is_active: e.target.checked,
                          }))
                        }
                      />
                      <label className="form-check-label small" htmlFor="editActive">
                        Active
                      </label>
                    </div>
                  </div>
                </div>
                <div className="account-approvals-detail-footer">
                  <button
                    type="button"
                    className="btn btn-light account-approvals-detail-close-btn"
                    onClick={() => {
                      if (submitting) return
                      closeEditModal()
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={submitting}
                    style={{
                      minWidth: 120,
                      ...primaryActionButtonStyle,
                    }}
                    onMouseEnter={(e) => {
                      if (submitting) return
                      e.currentTarget.style.backgroundColor = '#0A6B2E'
                      e.currentTarget.style.borderColor = '#0A6B2E'
                    }}
                    onMouseLeave={(e) => {
                      if (submitting) return
                      e.currentTarget.style.backgroundColor = '#0C8A3B'
                      e.currentTarget.style.borderColor = '#0C8A3B'
                    }}
                  >
                    {submitting ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <>
                        <i className="fas fa-save me-1" />
                        Save changes
                      </>
                    )}
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

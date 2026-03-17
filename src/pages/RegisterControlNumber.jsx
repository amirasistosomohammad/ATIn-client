import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { documentService } from '../services/documentService'
import { toast } from 'react-toastify'
import SearchableSelect from '../components/SearchableSelect'

export default function RegisterControlNumber() {
  const navigate = useNavigate()
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [documentTypeTouched, setDocumentTypeTouched] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [form, setForm] = useState({
    control_number: '',
    document_type_id: '',
    description: '',
  })

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true))
      return () => cancelAnimationFrame(id)
    }
    setShowContent(false)
  }, [loading])

  useEffect(() => {
    documentService.getDocumentTypes()
      .then(setTypes)
      .catch(() => toast.error('Failed to load document types'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.control_number.trim()) {
      toast.error('Control number is required')
      return
    }
    if (!form.document_type_id) {
      setDocumentTypeTouched(true)
      toast.error('Please select a document type')
      return
    }
    setSubmitting(true)
    try {
      await documentService.registerDocument({
        control_number: form.control_number.trim(),
        document_type_id: Number(form.document_type_id),
        description: form.description.trim() || undefined,
      })
      toast.success('Control number registered')
      navigate('/documents', { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
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
                <i className="fas fa-file-alt" />
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
                  Register control number
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
                  Preparing document types and form details&hellip;
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
                Loading form&hellip; Please wait.
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
            backgroundColor: '#d3e9d7', // darker muted green band for stronger contrast
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
                backgroundColor: '#0C8A3B', // solid green circle
                color: '#ffffff', // white icon for strong contrast
              }}
            >
              <i className="fas fa-file-alt" />
            </div>
            <div>
              <h2
                className="mb-1"
                style={{
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: '#1f2933',
                }}
              >
                Register control number
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: '#6b7280',
                }}
              >
                Create a new control number. Specify the official reference and document type as used in agency records.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} className="needs-validation" noValidate>
            <div className="mb-3">
              <label
                htmlFor="control_number"
                className="form-label mb-1"
                style={{
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Control number <span className="text-danger">*</span>
              </label>
              <input
                id="control_number"
                type="text"
                className="form-control"
                placeholder="Enter control number"
                value={form.control_number}
                onChange={(e) => setForm((f) => ({ ...f, control_number: e.target.value }))}
                required
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0C8A3B'
                  e.target.style.boxShadow = '0 0 0 0.15rem rgba(12, 138, 59, 0.25)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="document_type_id"
                className="form-label mb-1"
                style={{
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Document type <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="document_type_id"
                options={types.map((t) => `${t.name}${t.code ? ` (${t.code})` : ''}`)}
                value={
                  form.document_type_id
                    ? (types.find((t) => String(t.id) === String(form.document_type_id))?.name ?? '')
                    : ''
                }
                onChange={(label) => {
                  const match = types.find(
                    (t) => `${t.name}${t.code ? ` (${t.code})` : ''}` === label
                  )
                  setForm((prev) => ({ ...prev, document_type_id: match ? String(match.id) : '' }))
                }}
                disabled={submitting}
                invalid={documentTypeTouched && !form.document_type_id}
                placeholder="Search or select document type..."
                theme={{
                  primary: '#0C8A3B',
                  borderColor:
                    documentTypeTouched && !form.document_type_id ? '#dc3545' : '#d1d5db',
                  textPrimary: '#1a2a1a',
                }}
                inputStyle={{
                  paddingLeft: 14,
                  paddingRight: 30,
                  height: '38px',
                }}
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="description"
                className="form-label mb-1"
                style={{
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Brief description (optional)
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Enter short description of the document (optional)"
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0C8A3B'
                  e.target.style.boxShadow = '0 0 0 0.15rem rgba(12, 138, 59, 0.25)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <hr className="my-4" />

            <div className="d-flex flex-wrap gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(-1)}
                disabled={submitting}
                style={{
                  minWidth: 96,
                  borderRadius: 6,
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  borderColor: '#d1d5db',
                  color: '#4b5563',
                  backgroundColor: '#f9fafb',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (submitting) return
                  e.currentTarget.style.backgroundColor = '#e5e7eb'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  if (submitting) return
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={submitting}
                style={{
                  minWidth: 150,
                  borderRadius: 6,
                  backgroundColor: '#0C8A3B',
                  borderColor: '#0C8A3B',
                  color: '#ffffff',
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
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
                  <i className="fas fa-save" />
                )}
                <span>Save control number</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

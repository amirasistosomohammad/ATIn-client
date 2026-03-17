import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { documentService } from '../services/documentService'
import Portal from '../components/Portal.jsx'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
const headerBg = '#d3e9d7'
const headerBorder = '1px solid #b5d3ba'
const titleColor = '#1f2933'
const subtitleColor = '#6b7280'
const cardBorder = '1px solid #d1e2d6'
const toolbarBg = '#f9fafb'
const primaryGreen = '#0C8A3B'
const primaryGreenHover = '#0A6B2E'
const emptyIconBg = '#e5f3ea'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    withMe: 0,
    withPersonnel: 0,
    inTransit: 0,
    myDocuments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [summaryKey, setSummaryKey] = useState(null) // which card is open in modal
  const [summaryClosing, setSummaryClosing] = useState(false)

  const firstName = user?.name?.split(/\s+/)[0] || 'there'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [mine, tracking] = await Promise.all([
          documentService.getDocuments({ created_by_me: 1, per_page: 1 }).catch(() => ({ total: 0, data: [] })),
          documentService.getReportTracking({}).catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        const data = tracking.data || []
        const myTotal = mine.total ?? mine.data?.length ?? 0
        const withMe = data.filter((d) => d.current_holder?.id === user?.id).length
        const withPersonnel = data.filter((d) => d.current_holder != null).length
        const inTransit = data.filter((d) => d.status === 'in_transit').length
        setStats({
          total: data.length,
          withMe,
          withPersonnel,
          inTransit,
          myDocuments: myTotal,
        })
      } catch {
        if (!cancelled)
          setStats({
            total: 0,
            withMe: 0,
            withPersonnel: 0,
            inTransit: 0,
            myDocuments: 0,
          })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  if (loading) {
    return (
      <div className="page-enter">
        <div className="card border-0 shadow-sm w-100">
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
                  backgroundColor: primaryGreen,
                  color: '#ffffff',
                }}
              >
                <i className="fas fa-th-large" />
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
                  Dashboard
                </h2>
                <p
                  className="mb-0"
                  style={{
                    fontFamily: interFamily,
                    fontSize: '0.85rem',
                    color: subtitleColor,
                  }}
                >
                  Preparing your overview&hellip;
                </p>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ backgroundColor: '#f8faf9' }}>
            <div className="d-flex flex-column align-items-center justify-content-center py-4">
              <div
                className="spinner-border"
                role="status"
                style={{ width: '1.75rem', height: '1.75rem', color: primaryGreen }}
              />
              <p
                className="mt-3 mb-0 text-muted"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.9rem',
                }}
              >
                Loading dashboard&hellip; Please wait.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  let mainContent

  if (isAdmin) {
    mainContent = (
      <div className="card border-0 shadow-sm w-100">
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
                backgroundColor: primaryGreen,
                color: '#ffffff',
              }}
            >
              <i className="fas fa-chart-line" />
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
                System overview
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.85rem',
                  color: subtitleColor,
                }}
              >
                Monitor procurement documents, personnel activity, and administrative settings.
              </p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ backgroundColor: '#f8faf9' }}>
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-4">
                <div
                  className="p-3 rounded-3 h-100"
                  style={{
                    backgroundColor: '#ffffff',
                    border: cardBorder,
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
                  onClick={() => setSummaryKey('total')}
                >
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      minHeight: 36,
                      backgroundColor: emptyIconBg,
                      color: primaryGreen,
                    }}
                  >
                    <i className="fas fa-file-alt" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: subtitleColor,
                        marginBottom: 4,
                      }}
                    >
                      Total documents
                    </div>
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        color: '#111827',
                      }}
                    >
                      {stats.total}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.8rem',
                      }}
                    >
                      All documents tracked in the system.
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div
                  className="p-3 rounded-3 h-100"
                  style={{
                    backgroundColor: '#ffffff',
                    border: cardBorder,
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
                  onClick={() => setSummaryKey('with_personnel')}
                >
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      minHeight: 36,
                      backgroundColor: emptyIconBg,
                      color: primaryGreen,
                    }}
                  >
                    <i className="fas fa-user-check" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: subtitleColor,
                        marginBottom: 4,
                      }}
                    >
                      With personnel
                    </div>
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        color: '#111827',
                      }}
                    >
                      {stats.withPersonnel}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.8rem',
                      }}
                    >
                      Documents currently held by personnel.
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div
                  className="p-3 rounded-3 h-100"
                  style={{
                    backgroundColor: '#ffffff',
                    border: cardBorder,
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
                  onClick={() => setSummaryKey('in_transit')}
                >
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      minHeight: 36,
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                    }}
                  >
                    <i className="fas fa-exchange-alt" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: subtitleColor,
                        marginBottom: 4,
                      }}
                    >
                      In transit / released
                    </div>
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        color: '#111827',
                      }}
                    >
                      {stats.inTransit}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontFamily: interFamily,
                        fontSize: '0.8rem',
                      }}
                    >
                      Documents not currently assigned to a holder.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-lg-6">
                <div
                  className="rounded-3 h-100"
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
                      fontSize: '0.85rem',
                      color: titleColor,
                    }}
                  >
                    Document distribution
                  </div>
                  <div className="p-3" style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Total', value: stats.total },
                          { name: 'With personnel', value: stats.withPersonnel },
                          { name: 'In transit', value: stats.inTransit },
                        ]}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4b5563' }} />
                        <Tooltip
                          cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                          contentStyle={{
                            fontFamily: interFamily,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={primaryGreen} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-3"
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
                  fontSize: '0.85rem',
                  color: titleColor,
                }}
              >
                Administrative actions
              </div>
              <div className="p-3">
                <div className="d-flex flex-wrap gap-2">
                  <Link to="/admin/users" className="btn btn-sm btn-outline-success">
                    <i className="fas fa-users me-1" />
                    Manage users
                  </Link>
                  <Link to="/admin/document-types" className="btn btn-sm btn-outline-success">
                    <i className="fas fa-list-alt me-1" />
                    Document types
                  </Link>
                  <Link to="/reports" className="btn btn-sm btn-outline-secondary">
                    <i className="fas fa-chart-bar me-1" />
                    Reports
                  </Link>
                  <Link to="/track" className="btn btn-sm btn-outline-secondary">
                    <i className="fas fa-search me-1" />
                    Track by control number
                  </Link>
                  <Link to="/admin/settings" className="btn btn-sm btn-outline-secondary">
                    <i className="fas fa-cog me-1" />
                    System settings
                  </Link>
                </div>
              </div>
            </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    mainContent = (
      <div className="card border-0 shadow-sm w-100">
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
                backgroundColor: primaryGreen,
                color: '#ffffff',
              }}
            >
              <i className="fas fa-th-large" />
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
                Dashboard
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.85rem',
                  color: subtitleColor,
                }}
              >
                Welcome back, {firstName}. View your documents and current holdings at a glance.
              </p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ backgroundColor: '#f8faf9' }}>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <div
                className="p-3 rounded-3 h-100"
                style={{
                  backgroundColor: '#ffffff',
                  border: cardBorder,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition:
                    'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
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
                onClick={() => setSummaryKey('my_docs')}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    minHeight: 36,
                    backgroundColor: emptyIconBg,
                    color: primaryGreen,
                  }}
                >
                  <i className="fas fa-folder-open" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: subtitleColor,
                      marginBottom: 4,
                    }}
                  >
                    My documents
                  </div>
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: '#111827',
                    }}
                  >
                    {stats.myDocuments ?? stats.total}
                  </div>
                  <div
                    className="text-muted"
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.8rem',
                    }}
                  >
                    Documents you registered.
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div
                className="p-3 rounded-3 h-100"
                style={{
                  backgroundColor: '#ffffff',
                  border: cardBorder,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition:
                    'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
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
                onClick={() => setSummaryKey('with_me')}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    minHeight: 36,
                    backgroundColor: emptyIconBg,
                    color: primaryGreen,
                  }}
                >
                  <i className="fas fa-user-check" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: subtitleColor,
                      marginBottom: 4,
                    }}
                  >
                    With me
                  </div>
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: '#111827',
                    }}
                  >
                    {stats.withMe}
                  </div>
                  <div
                    className="text-muted"
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.8rem',
                    }}
                  >
                    Documents currently in your custody.
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div
                className="p-3 rounded-3 h-100"
                style={{
                  backgroundColor: '#ffffff',
                  border: cardBorder,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition:
                    'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
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
                onClick={() => setSummaryKey('released')}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    minHeight: 36,
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                  }}
                >
                  <i className="fas fa-exchange-alt" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: subtitleColor,
                      marginBottom: 4,
                    }}
                  >
                    Released
                  </div>
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: '#111827',
                    }}
                  >
                    {stats.inTransit}
                  </div>
                  <div
                    className="text-muted"
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.8rem',
                    }}
                  >
                    Released / in transit (no active holder).
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <div
                className="rounded-3 h-100"
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
                    fontSize: '0.85rem',
                    color: titleColor,
                  }}
                >
                  Document snapshot
                </div>
                <div className="p-3" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'My docs', value: stats.myDocuments ?? stats.total },
                        { name: 'With me', value: stats.withMe },
                        { name: 'Released', value: stats.inTransit },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4b5563' }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                        contentStyle={{
                          fontFamily: interFamily,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={primaryGreen} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-3"
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
                fontSize: '0.9rem',
                color: titleColor,
              }}
            >
              Quick actions
            </div>
            <div className="p-3">
              <div className="d-flex flex-wrap gap-2">
                <Link
                  to="/track"
                  className="btn btn-sm"
                  style={{
                    borderRadius: 6,
                    backgroundColor: primaryGreen,
                    borderColor: primaryGreen,
                    color: '#ffffff',
                    fontFamily: interFamily,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = primaryGreenHover
                    e.currentTarget.style.borderColor = primaryGreenHover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = primaryGreen
                    e.currentTarget.style.borderColor = primaryGreen
                  }}
                >
                  <i className="fas fa-search me-1" />
                  Track by control number
                </Link>
                <Link
                  to="/documents/register"
                  className="btn btn-sm btn-outline-success"
                  style={{
                    borderRadius: 6,
                    fontFamily: interFamily,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                  }}
                >
                  <i className="fas fa-plus-circle me-1" />
                  Register control number
                </Link>
                <Link
                  to="/documents"
                  className="btn btn-sm btn-outline-secondary"
                  style={{
                    borderRadius: 6,
                    fontFamily: interFamily,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                  }}
                >
                  <i className="fas fa-folder-open me-1" />
                  My documents
                </Link>
                <Link
                  to="/reports"
                  className="btn btn-sm btn-outline-secondary"
                  style={{
                    borderRadius: 6,
                    fontFamily: interFamily,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                  }}
                >
                  <i className="fas fa-chart-bar me-1" />
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      {mainContent}
      {/* Shared summary modal for both personnel and admin dashboards */}
      {summaryKey && (
        <Portal>
          <div
            className="account-approvals-detail-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-summary-modal-title"
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
                  setSummaryKey(null)
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
                  backgroundColor: toolbarBg,
                }}
              >
                <div>
                  <h5
                    id="dashboard-summary-modal-title"
                    className="mb-1"
                    style={{
                      fontFamily: interFamily,
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    {isAdmin && summaryKey === 'total' && 'Total documents'}
                    {isAdmin && summaryKey === 'with_personnel' && 'Documents with personnel'}
                    {isAdmin && summaryKey === 'in_transit' && 'Documents in transit / released'}
                    {!isAdmin && summaryKey === 'my_docs' && 'My documents'}
                    {!isAdmin && summaryKey === 'with_me' && 'Documents with me'}
                    {!isAdmin && summaryKey === 'released' && 'Released documents'}
                  </h5>
                  <p
                    className="mb-0"
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.85rem',
                      color: subtitleColor,
                    }}
                  >
                    Full count as of the latest dashboard refresh.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={() => {
                    setSummaryClosing(true)
                    setTimeout(() => {
                      setSummaryClosing(false)
                      setSummaryKey(null)
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
                    fontFamily: interFamily,
                    fontWeight: 700,
                    fontSize: '2.4rem',
                    color: primaryGreen,
                    marginBottom: '0.6rem',
                  }}
                >
                  {isAdmin && summaryKey === 'total' && stats.total}
                  {isAdmin && summaryKey === 'with_personnel' && stats.withPersonnel}
                  {isAdmin && summaryKey === 'in_transit' && stats.inTransit}
                  {!isAdmin && summaryKey === 'my_docs' && (stats.myDocuments ?? stats.total)}
                  {!isAdmin && summaryKey === 'with_me' && stats.withMe}
                  {!isAdmin && summaryKey === 'released' && stats.inTransit}
                </div>
                <div
                  style={{
                    fontFamily: interFamily,
                    fontSize: '0.9rem',
                    color: subtitleColor,
                  }}
                >
                  {isAdmin && summaryKey === 'total' && 'Total document records in the system.'}
                  {isAdmin &&
                    summaryKey === 'with_personnel' &&
                    'Documents currently assigned to personnel.'}
                  {isAdmin &&
                    summaryKey === 'in_transit' &&
                    'Documents that are released / in transit with no active holder.'}
                  {!isAdmin &&
                    summaryKey === 'my_docs' &&
                    'Control numbers you have registered as document owner.'}
                  {!isAdmin &&
                    summaryKey === 'with_me' &&
                    'Documents that are currently in your custody.'}
                  {!isAdmin &&
                    summaryKey === 'released' &&
                    'Documents you released that are currently in transit.'}
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
                      setSummaryKey(null)
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

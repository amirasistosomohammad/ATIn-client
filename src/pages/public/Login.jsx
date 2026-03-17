import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { showAlert } from '../../services/notificationService'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import backgroundImage from '../../assets/background-image.png'
import { useBranding } from '../../context/BrandingContext'

const FOOTER_HEIGHT_PX = 60
const theme = {
  primary: '#0C8A3B',
  primaryDark: '#0A6B2E',
  primaryLight: '#0EA045',
  accent: '#F8C202',
  textPrimary: '#1a2a1a',
  textSecondary: '#4a5c4a',
  backgroundLight: '#f8faf8',
  backgroundWhite: '#ffffff',
  borderColor: '#e0e6e0',
}

const FOOTER_TAGLINE = 'Agricultural Training Institute — Regional Training Center IX'

export default function Login() {
  const { logoUrl, appName, authBackgroundUrl, brandingLoaded } = useBranding()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inactiveInfo, setInactiveInfo] = useState(null) // { name, email, remarks, message }
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('login-page-active')
    document.body.classList.add('login-page-active')
    return () => {
      document.documentElement.classList.remove('login-page-active')
      document.body.classList.remove('login-page-active')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      showAlert.error('Validation Error', 'Please fill in all fields')
      return
    }
    setIsSubmitting(true)
    try {
      await login(form.email, form.password)
      toast.success('Login successful')
      navigate(from, { replace: true })
    } catch (error) {
      const backendStatus = error?.code || error?.data?.status || error?.data?.code
      const message = (error?.message || '').toLowerCase()
      const looksInactive =
        error?.code === 'ACCOUNT_INACTIVE' ||
        backendStatus === 'inactive' ||
        backendStatus === 'deactivated' ||
        message.includes('deactivated') ||
        message.includes('disabled') ||
        message.includes('inactive')

      if (looksInactive) {
        const backendUser = error.user || error.data?.user || null

        // Backend sends deactivation_remarks on 403; authService also sets error.remarks.
        let backendRemarks =
          (error.remarks ?? error.data?.deactivation_remarks ?? error.data?.last_admin_remarks ?? error.data?.remarks) ?? null
        if (backendRemarks != null) backendRemarks = (String(backendRemarks).trim() || null)

        // Common Laravel pattern: message + errors.email[0]
        const emailError =
          Array.isArray(error.data?.errors?.email) && error.data.errors.email.length > 0
            ? String(error.data.errors.email[0])
            : null

        // Prefer a dedicated remark; otherwise, use the first email error if it
        // adds extra detail beyond the main message.
        const baseMessage =
          error?.message ||
          error.data?.message ||
          'Your account is currently deactivated and cannot be used to sign in.'

        if (!backendRemarks && emailError) {
          // Avoid duplicating the same sentence twice.
          backendRemarks =
            emailError.trim() === baseMessage.trim() ? null : emailError
        }

        // Frontend fallback: if backend did not return remarks, look up
        // what the admin last entered for this email from localStorage.
        if (!backendRemarks) {
          try {
            const key = 'deactivationRemarksByEmail'
            const raw = window.localStorage.getItem(key)
            if (raw) {
              const map = JSON.parse(raw)
              const emailKey = (backendUser?.email || form.email || '').toLowerCase()
              const stored = map[emailKey] || map[backendUser?.email] || null
              if (stored?.remarks) {
                backendRemarks = stored.remarks
              }
            }
          } catch {
            // ignore storage errors
          }
        }

        setInactiveInfo({
          name: backendUser?.name || form.email,
          email: backendUser?.email || form.email,
          message: baseMessage,
          remarks:
            backendRemarks ||
            'No additional remarks were recorded at the time this account was deactivated.',
        })
      } else {
        toast.error(
          error?.message || 'Please check your credentials and try again.',
          { position: 'top-right', autoClose: 3000, hideProgressBar: false }
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const isMobile = windowWidth < 576
  const logoSize = isMobile ? 100 : 120
  const cardPadding = isMobile ? '30px 20px' : '40px'
  const titleFontSize = isMobile ? '20px' : '24px'
  const labelFontSize = isMobile ? '0.85rem' : '0.9rem'
  const inputFontSize = isMobile ? '14px' : '16px'
  const footerFontSize = isMobile ? '11px' : '13px'
  const footerPadding = isMobile ? '10px 15px' : '12px 20px'

  return (
    <div
      id="login-page"
      className="d-flex flex-column position-relative login-page-root"
      style={{
        height: '100vh',
        height: '100dvh',
        maxHeight: '-webkit-fill-available',
        overflow: 'hidden',
        boxSizing: 'border-box',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingTop: 0,
        paddingBottom: FOOTER_HEIGHT_PX,
        zIndex: 1,
      }}
    >
      <div
        className="position-fixed"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${authBackgroundUrl || backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: theme.backgroundLight,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div
        className="position-fixed"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 46, 31, 0.45)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
        aria-hidden
      />

      <div
        className="flex-grow-1 d-flex align-items-center justify-content-center position-relative min-h-0"
        style={{ zIndex: 2 }}
      >
        <div
          className="bg-white rounded-4 shadow-lg position-relative"
          style={{
            maxWidth: '420px',
            width: '100%',
            padding: cardPadding,
            border: `1px solid ${theme.borderColor}`,
            animation: 'fadeIn 0.6s ease-in-out',
            zIndex: 1,
          }}
        >
          <div className="text-center mb-4">
            {brandingLoaded ? (
              <img
                key={logoUrl}
                src={logoUrl}
                alt={appName}
                className="branding-fade-in"
                style={{
                  width: `${logoSize}px`,
                  height: `${logoSize}px`,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div
                className="branding-skeleton-logo"
                style={{ width: logoSize, height: logoSize, margin: '0 auto' }}
              />
            )}
          </div>

          <h5
            className="text-center fw-bold"
            style={{
              marginTop: '2rem',
              marginBottom: '2rem',
              color: theme.primary,
              fontSize: titleFontSize,
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {brandingLoaded ? (
              <span className="branding-fade-in">{appName}</span>
            ) : (
              <span
                className="branding-skeleton-text"
                style={{ display: 'inline-block', width: 220, height: 18 }}
              />
            )}
          </h5>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="email"
              className="mb-1 fw-semibold d-block"
              style={{
                fontSize: labelFontSize,
                color: theme.textSecondary,
              }}
            >
              Email
            </label>
            <div className="mb-3 position-relative">
              <FaEnvelope
                className="position-absolute top-50 translate-middle-y text-muted"
                size={16}
                style={{ left: '15px', zIndex: 1 }}
              />
              <input
                type="email"
                name="email"
                id="email"
                className="form-control fw-semibold"
                placeholder="Email"
                value={form.email}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  paddingLeft: '45px',
                  backgroundColor: theme.backgroundWhite,
                  color: theme.textPrimary,
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: inputFontSize,
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.primary
                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <label
              htmlFor="password"
              className="mb-1 fw-semibold d-block"
              style={{
                fontSize: labelFontSize,
                color: theme.textSecondary,
              }}
            >
              Password
            </label>
            <div className="mb-3 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted"
                size={16}
                style={{ left: '15px', zIndex: 1 }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                className="form-control fw-semibold"
                placeholder="Password"
                value={form.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  paddingLeft: '45px',
                  paddingRight: '45px',
                  backgroundColor: theme.backgroundWhite,
                  color: theme.textPrimary,
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: inputFontSize,
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.primary
                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <span
                onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                className="position-absolute top-50 translate-middle-y text-muted"
                style={{
                  right: '15px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  zIndex: 1,
                }}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
            </div>

            <div className="text-end mb-3">
              <Link
                to="/forgot-password"
                className="login-form-link login-form-link--forgot"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-100 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{
                backgroundColor: theme.primary,
                color: theme.backgroundWhite,
                border: 'none',
                borderRadius: '8px',
                fontSize: inputFontSize,
                transition: 'all 0.3s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
                marginTop: '10px',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = theme.primaryDark
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(12, 138, 59, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = theme.primary
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 2px 10px rgba(12, 138, 59, 0.3)'
                }
              }}
              onMouseDown={(e) => {
                if (!isSubmitting) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 2px 10px rgba(12, 138, 59, 0.3)'
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="fa-spin me-2" size={18} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="login-form-register-wrap text-center mb-0 mt-3">
              Don't have an account?{' '}
              <Link to="/register" className="login-form-link login-form-link--register">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>

      <footer
        className="position-fixed bottom-0 start-0 w-100"
        style={{
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: 'none',
          boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.06)',
          backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.92))',
          padding: footerPadding,
        }}
      >
        <div className="text-center">
          <p
            className="mb-0 fw-semibold"
            style={{
              fontSize: footerFontSize,
              color: theme.textSecondary,
            }}
          >
            © {new Date().getFullYear()} {appName}. {FOOTER_TAGLINE}. All rights reserved.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-form-link {
          text-decoration: none !important;
          cursor: pointer;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          position: relative;
          padding-bottom: 1px;
          transition: color 0.25s ease-in-out, transform 0.25s ease-in-out;
        }
        .login-form-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 0;
          background-color: currentColor;
          transition: width 0.25s ease-in-out;
        }
        .login-form-link:hover::after {
          width: 100%;
        }
        .login-form-link--forgot {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0C8A3B;
          letter-spacing: 0.01em;
        }
        .login-form-link--forgot:hover {
          color: #0A6B2E;
          transform: translateY(-1px);
        }
        .login-form-link--register {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0C8A3B;
          letter-spacing: 0.01em;
        }
        .login-form-link--register:hover {
          color: #0A6B2E;
          transform: translateY(-1px);
        }
        .login-form-register-wrap {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0C8A3B;
          line-height: 1.5;
        }
        @media (max-width: 575.98px) {
          .login-form-link--forgot,
          .login-form-link--register {
            font-size: 0.85rem;
          }
          .login-form-register-wrap {
            font-size: 0.85rem;
          }
        }
      `}</style>

      {inactiveInfo && (
        <div
          className="account-approvals-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inactive-account-modal-title"
          tabIndex={-1}
        >
          <div
            className="account-approvals-detail-backdrop modal-backdrop-animation"
            onClick={() => setInactiveInfo(null)}
            aria-hidden
          />
          <div
            className="account-approvals-detail-modal modal-content-animation"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
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
                  id="inactive-account-modal-title"
                  className="mb-1"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#111827',
                  }}
                >
                  Account access unavailable
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
                  The account below is currently deactivated by an administrator.
                </p>
              </div>
              <button
                type="button"
                className="btn-close-custom"
                onClick={() => setInactiveInfo(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
              <div className="mb-3">
                <div
                  className="fw-semibold"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                    color: '#111827',
                  }}
                >
                  {inactiveInfo.name}
                </div>
                <div
                  className="text-muted small"
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  }}
                >
                  {inactiveInfo.email}
                </div>
              </div>

              <div
                className="p-3 rounded-3"
                style={{
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
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
                  {inactiveInfo.message}
                </div>
                <div
                  className="mt-3"
                  style={{
                    borderTop: '1px dashed #e5e7eb',
                    paddingTop: '0.75rem',
                  }}
                >
                  <div
                    className="text-uppercase text-muted mb-1"
                    style={{ fontSize: '0.72rem' }}
                  >
                    Admin remarks
                  </div>
                  <div
                    style={{
                      fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '0.9rem',
                      color: '#4b5563',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {inactiveInfo.remarks}
                  </div>
                </div>
              </div>

              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={() => setInactiveInfo(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

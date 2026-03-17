import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { FaLock, FaEye, FaEyeSlash, FaSpinner, FaEnvelope, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify'
import backgroundImage from '../../assets/background-image.png'
import { useBranding } from '../../context/BrandingContext'

const FOOTER_HEIGHT_PX = 60
const theme = {
  primary: '#0C8A3B',
  primaryDark: '#0A6B2E',
  textPrimary: '#1a2a1a',
  textSecondary: '#4a5c4a',
  backgroundWhite: '#ffffff',
  borderColor: '#e0e6e0',
}

const FOOTER_TAGLINE = 'Agricultural Training Institute — Regional Training Center IX'

function validatePasswordRules(value) {
  return {
    minLength: value.length >= 8,
    hasLetter: /[A-Za-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
  }
}

export default function ResetPassword() {
  const { logoUrl, appName, authBackgroundUrl, brandingLoaded } = useBranding()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [form, setForm] = useState({
    password: '',
    password_confirmation: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  })
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const { resetPassword } = useAuth()

  useEffect(() => {
    if (!token || !emailParam) {
      toast.error('Invalid or missing reset link. Please request a new one.')
      navigate('/forgot-password', { replace: true })
    }
  }, [token, emailParam, navigate])

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
    if (!token || !emailParam) return
    if (form.password !== form.password_confirmation) {
      toast.error('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(form.password)) {
      toast.error('Password must contain at least one letter and one number.')
      return
    }
    setIsSubmitting(true)
    try {
      await resetPassword({
        email: emailParam,
        token,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      toast.success('Your password has been reset. You can now sign in.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Reset failed. Please try again or request a new link.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'password') {
      if (value.length > 0) setShowPasswordCriteria(true)
      setPasswordValidation(validatePasswordRules(value))
    }
  }

  if (!token || !emailParam) {
    return null
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
      id="reset-password-page"
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
          backgroundColor: '#f8faf8',
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
              marginBottom: '0.5rem',
              color: theme.primary,
              fontSize: titleFontSize,
              lineHeight: 1.2,
            }}
          >
            Set new password
          </h5>
          <p
            className="text-center mb-3"
            style={{
              fontSize: labelFontSize,
              color: theme.textSecondary,
            }}
          >
            Enter your new password below. Use at least 8 characters with one letter and one number.
          </p>

          {/* Display current email (same as TheMidTaskApp) */}
          <div
            className="d-flex align-items-center rounded-3 mb-3 px-3 py-2"
            style={{
              backgroundColor: 'rgba(12, 138, 59, 0.08)',
              border: `1px solid ${theme.borderColor}`,
            }}
          >
            <FaEnvelope className="me-2 text-muted" size={16} style={{ flexShrink: 0 }} />
            <span
              className="text-break fw-semibold"
              style={{ fontSize: labelFontSize, color: theme.textPrimary }}
              title={emailParam}
            >
              {emailParam}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="reset-password"
              className="mb-1 fw-semibold d-block"
              style={{ fontSize: labelFontSize, color: theme.textSecondary }}
            >
              New password
            </label>
            <div className="mb-2 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted"
                size={16}
                style={{ left: '15px', zIndex: 1 }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="reset-password"
                className="form-control fw-semibold"
                placeholder="New password"
                value={form.password}
                onChange={handleInputChange}
                onFocus={(e) => {
                  setShowPasswordCriteria(true)
                  e.target.style.borderColor = theme.primary
                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
                required
                minLength={8}
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
              />
              {(form.password || showPasswordCriteria) && (
                <span
                  className="position-absolute top-50 translate-middle-y"
                  style={{
                    right: '36px',
                    zIndex: 1,
                    pointerEvents: 'none',
                    color:
                      passwordValidation.minLength &&
                      passwordValidation.hasLetter &&
                      passwordValidation.hasNumber
                        ? theme.primary
                        : '#dc3545',
                  }}
                  aria-hidden
                >
                  {passwordValidation.minLength &&
                  passwordValidation.hasLetter &&
                  passwordValidation.hasNumber ? (
                    <FaCheckCircle size={18} title="Valid" />
                  ) : (
                    <FaExclamationCircle size={18} title="Invalid" />
                  )}
                </span>
              )}
              <span
                onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                className="position-absolute top-50 translate-middle-y text-muted"
                style={{ right: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', zIndex: 1 }}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
            </div>

            {/* Password criteria: smooth transition (same as Register page) */}
            <div
              className={`reset-password-criteria-wrapper ${showPasswordCriteria ? 'open' : ''}`}
            >
              <div
                className="reset-password-criteria mb-3"
                style={{
                  backgroundColor: 'rgba(12, 138, 59, 0.08)',
                  border: `1px solid ${theme.borderColor}`,
                  color: theme.textSecondary,
                }}
              >
                <div
                  className={`reset-password-criteria-item ${passwordValidation.minLength ? 'text-success' : ''}`}
                >
                  • At least 8 characters
                </div>
                <div
                  className={`reset-password-criteria-item ${passwordValidation.hasLetter ? 'text-success' : ''}`}
                >
                  • Contains a letter
                </div>
                <div
                  className={`reset-password-criteria-item ${passwordValidation.hasNumber ? 'text-success' : ''}`}
                >
                  • Contains a number
                </div>
              </div>
            </div>

            <label
              htmlFor="reset-password-confirm"
              className="mb-1 fw-semibold d-block"
              style={{ fontSize: labelFontSize, color: theme.textSecondary }}
            >
              Confirm password
            </label>
            <div className="mb-3 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted"
                size={16}
                style={{ left: '15px', zIndex: 1 }}
              />
              <input
                type={showConfirm ? 'text' : 'password'}
                name="password_confirmation"
                id="reset-password-confirm"
                className="form-control fw-semibold"
                placeholder="Confirm new password"
                value={form.password_confirmation}
                onChange={handleInputChange}
                required
                minLength={8}
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
                onClick={() => !isSubmitting && setShowConfirm(!showConfirm)}
                className="position-absolute top-50 translate-middle-y text-muted"
                style={{ right: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', zIndex: 1 }}
              >
                {showConfirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
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
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="fa-spin me-2" size={18} />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </button>

            <p className="text-center mb-0 mt-3" style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.textSecondary }}>
              <Link to="/" className="login-form-link login-form-link--forgot">
                Back to sign in
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
          boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.06)',
          padding: footerPadding,
        }}
      >
        <div className="text-center">
          <p className="mb-0 fw-semibold" style={{ fontSize: footerFontSize, color: theme.textSecondary }}>
            © {new Date().getFullYear()} {appName || BRAND_NAME}. {FOOTER_TAGLINE}. All rights reserved.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-form-link { text-decoration: none !important; cursor: pointer; position: relative; padding-bottom: 1px; transition: color 0.25s ease-in-out, transform 0.25s ease-in-out; }
        .login-form-link::after { content: ""; position: absolute; left: 0; bottom: 0; height: 2px; width: 0; background-color: currentColor; transition: width 0.25s ease-in-out; }
        .login-form-link:hover::after { width: 100%; }
        .login-form-link--forgot { font-size: 0.9rem; font-weight: 700; color: #0C8A3B; }
        .login-form-link--forgot:hover { color: #0A6B2E; transform: translateY(-1px); }
        /* Password criteria smooth transition (same as Register page) */
        .reset-password-criteria-wrapper {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.35s ease-out, opacity 0.3s ease-out;
        }
        .reset-password-criteria-wrapper.open {
          max-height: 120px;
          opacity: 1;
          transition: max-height 0.4s ease-in, opacity 0.3s ease-in;
        }
        .reset-password-criteria {
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }
        .reset-password-criteria-item {
          transition: color 0.25s ease-in-out;
        }
        .reset-password-criteria-item:not(:last-child) {
          margin-bottom: 0.2rem;
        }
      `}</style>
    </div>
  )
}

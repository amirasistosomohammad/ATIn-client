import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaIdCard,
  FaSpinner,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationCircle,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../services/notificationService'
import { getHomePathForUser } from '../../utils/authRouting'
import SearchableSelect from '../../components/SearchableSelect'
import 'react-toastify/dist/ReactToastify.css'
import backgroundImage from '../../assets/background-image.png'
import systemLogo from '../../assets/system_logo.png'

const BRAND_NAME = 'ATIn e-Track System'

const theme = {
  primary: '#0C8A3B',
  primaryDark: '#0A6B2E',
  textPrimary: '#1a2a1a',
  textSecondary: '#4a5c4a',
  backgroundLight: '#f8faf8',
  backgroundWhite: '#ffffff',
  borderColor: '#e0e6e0',
}

const SECTION_UNIT_OPTIONS = [
  'OCD- OFFICE OF THE CENTER DIRECTOR',
  'CDMS- CAREER DEVELOPMENT AND MANAGEMENT SECTION',
  'PAS- PARTNERSHIP AND ACCREDITATION SECTION',
  'ISS - INFORMATION AND SERVICES SECTION',
  'PMEU- PLANNING AND MONITORING UNIT',
  'BUDGET',
  'HR- HUMAN RESOURCE',
  'ACCTG- ACCOUNTING',
  'GSS- GENERAL SERVICES SECTION',
  'SUPPLY',
  'CFIDP',
  'RCEF',
]

const DESIGNATION_POSITION_OPTIONS = [
  'AO IV',
  'SG I',
  'TS III',
  'PEO I',
  'ACCTNT I',
  'SG II',
  'DMO I',
  'TS II',
  'MPS II',
  'AO II',
  'AG II',
  'IO II',
  'AO I',
  'IO-II',
  'TS-I',
  'TCS II',
  'TCS I',
  'AG I',
  'DMO II',
  'AA III',
  'NC I',
  'DM II',
  'IO III',
  'PO II',
  'TECHNICAL STAFF',
  'ADMIN SUPPORT STAFF',
]

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  })
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false)
  const [step, setStep] = useState('form')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpInputRefs = useRef([])
  const rightPanelRef = useRef(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    section_unit: '',
    designation_position: '',
    password: '',
    confirmPassword: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPageEntered, setIsPageEntered] = useState(false)
  const navigate = useNavigate()
  const { register: registerUser, verifyEmail, resendOtp, login } = useAuth()

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCooldown])

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsPageEntered(true))
    })
    return () => cancelAnimationFrame(rafId)
  }, [])

  useEffect(() => {
    if (step === 'otp') {
      const scrollEl = rightPanelRef.current
      if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' })
      const t = setTimeout(() => otpInputRefs.current[0]?.focus(), 500)
      return () => clearTimeout(t)
    }
  }, [step])

  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otpDigits]
    next[index] = value.slice(-1)
    setOtpDigits(next)
    setOtpError('')
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').slice(0, 6)
    if (/^\d+$/.test(pasted)) {
      const arr = pasted.split('').concat(Array(6 - pasted.length).fill(''))
      setOtpDigits(arr.slice(0, 6))
      setOtpError('')
      const last = Math.min(pasted.length - 1, 5)
      otpInputRefs.current[last]?.focus()
    }
  }

  const handleOtpVerify = async (e) => {
    e.preventDefault()
    const otpString = otpDigits.join('')
    if (otpString.length !== 6) {
      setOtpError('Please enter the complete 6-digit code.')
      return
    }
    setVerifyLoading(true)
    setOtpError('')
    try {
      const verifyResult = await verifyEmail(form.email.trim(), otpString)
      if (!verifyResult.success) {
        setOtpError(verifyResult.error || 'Invalid or expired code. Please try again.')
        setOtpDigits(['', '', '', '', '', ''])
        otpInputRefs.current[0]?.focus()
        return
      }
      const loginResult = await login(form.email.trim(), form.password)
      if (loginResult.success) {
        showToast.success('Email verified. Welcome!')
        navigate(getHomePathForUser(loginResult.user), { replace: true })
      } else {
        showToast.error(loginResult.error || 'Sign in failed.')
        navigate('/login', { replace: true })
      }
    } catch (err) {
      const msg =
        err.data?.message ||
        (err.data?.errors?.otp ? err.data.errors.otp[0] : null) ||
        err.message ||
        'Verification failed.'
      setOtpError(msg)
      setOtpDigits(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setResendLoading(true)
    setOtpError('')
    try {
      await resendOtp(form.email.trim())
      setResendCooldown(60)
      showToast.success('A new code has been sent to your email.')
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to resend code. Please try again.'
      setOtpError(msg)
    } finally {
      setResendLoading(false)
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValidEmailFormat = (email) => emailPattern.test(email)

  const validateEmailFormat = (email) => {
    if (!isValidEmailFormat(email)) {
      setFieldErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }))
      return false
    }
    setFieldErrors((prev) => ({ ...prev, email: '' }))
    return true
  }

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[A-Za-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    }
    setPasswordValidation(validation)
    return validation
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'password' && value.length > 0) setShowPasswordCriteria(true)
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    if (name === 'password') validatePassword(value)
  }

  const validateForm = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Please enter your full name'
    if (!form.email.trim()) {
      errors.email = 'Please enter your email address'
    } else if (!validateEmailFormat(form.email)) {
      errors.email = fieldErrors.email || 'Please enter a valid email address'
    }
    if (!form.section_unit.trim()) errors.section_unit = 'Please select Section & Unit'
    if (!form.designation_position.trim())
      errors.designation_position = 'Please select Designation/Position'
    if (!form.password) {
      errors.password = 'Please enter a password'
    } else {
      const validation = validatePassword(form.password)
      const allOk = validation.minLength && validation.hasLetter && validation.hasNumber
      if (!allOk) {
        errors.password =
          'Password must be at least 8 characters and include a letter and a number.'
      }
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords don't match"
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showToast.error(Object.values(errors)[0])
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const result = await registerUser(form)
      if (result.success) {
        showToast.success(result.message || 'Check your email for the 6-digit code.')
        setStep('otp')
        setOtpError('')
        setOtpDigits(['', '', '', '', '', ''])
      } else {
        showToast.error(result.error || 'Please try again.')
      }
    } catch (error) {
      const errData = error.data || {}
      const message =
        errData.message ||
        (errData.errors ? Object.values(errData.errors).flat().join(' ') : null) ||
        error.message ||
        'There was an error creating your account. Please try again.'
      showToast.error(message)
      if (errData.errors && typeof errData.errors === 'object') {
        const flat = {}
        for (const [k, v] of Object.entries(errData.errors)) {
          flat[k] = Array.isArray(v) ? v[0] : v
        }
        setFieldErrors(flat)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle = (fieldName) => ({
    paddingLeft: '42px',
    paddingRight:
      fieldName === 'password' || fieldName === 'confirmPassword' ? '50px' : '40px',
    backgroundColor: theme.backgroundWhite,
    color: theme.textPrimary,
    border: `1px solid ${fieldErrors[fieldName] ? '#dc3545' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
  })

  const focusRing = {
    onFocus: (e) => {
      if (fieldErrors[e.target.name]) return
      e.target.style.borderColor = theme.primary
      e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
    },
    onBlur: (e) => {
      e.target.style.borderColor = fieldErrors[e.target.name] ? '#dc3545' : '#d1d5db'
      e.target.style.boxShadow = 'none'
    },
  }

  return (
    <div className={`register-page auth-layout${isPageEntered ? ' register-page-enter' : ''}`}>
      {/* Left panel – even 50% split, background image + overlay (same as reference) */}
      <div
        className="register-auth-left auth-left"
        style={{
          position: 'relative',
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: theme.backgroundLight,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(26, 46, 31, 0.45)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Right panel – even 50% split, scrollable, grid background (same as reference) */}
      <div ref={rightPanelRef} className="register-auth-right auth-right">
        <div className="register-auth-right-inner">
          <div className="register-form-card">
          {/* Logo */}
          <div className="text-center mb-3">
            <img
              src={systemLogo}
              alt={BRAND_NAME}
              style={{
                width: 100,
                height: 100,
                objectFit: 'contain',
              }}
            />
          </div>

          {step === 'form' ? (
            <>
              <h5
                className="text-center fw-bold mb-2"
                style={{ color: theme.primary, fontSize: '1.35rem' }}
              >
                Create Your Account
              </h5>
              <p
                className="text-center mb-4"
                style={{
                  fontSize: '0.9rem',
                  color: theme.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                Register using your official institutional email to securely access the ATIn
                e-Track System.
              </p>

              <form onSubmit={handleSubmit} className="w-100">
                {/* Full Name */}
                <label
                  htmlFor="name"
                  className="mb-1 fw-semibold d-block"
                  style={{ fontSize: '0.9rem', color: theme.textSecondary }}
                >
                  Full Name *
                </label>
                <div className="mb-3">
                  <div className="position-relative" style={{ width: '100%' }}>
                    <FaUser
                      className="position-absolute top-50 translate-middle-y"
                      size={16}
                      style={{ left: 14, color: theme.textSecondary, zIndex: 1 }}
                    />
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className="form-control"
                      placeholder="Full Name"
                      value={form.name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      style={inputStyle('name')}
                      {...focusRing}
                    />
                    {(form.name.trim() || fieldErrors.name) && (
                      <span
                        className="position-absolute top-50 translate-middle-y"
                        style={{
                          right: 14,
                          zIndex: 1,
                          pointerEvents: 'none',
                          color: fieldErrors.name ? '#dc3545' : theme.primary,
                        }}
                        aria-hidden
                      >
                        {fieldErrors.name ? (
                          <FaExclamationCircle size={18} title="Invalid" />
                        ) : (
                          <FaCheckCircle size={18} title="Valid" />
                        )}
                      </span>
                    )}
                  </div>
                  {fieldErrors.name && (
                    <small className="text-danger d-block mt-1 register-field-error">{fieldErrors.name}</small>
                  )}
                </div>

                {/* Institutional Email */}
                <label
                  htmlFor="email"
                  className="mb-1 fw-semibold d-block"
                  style={{ fontSize: '0.9rem', color: theme.textSecondary }}
                >
                  Institutional Email *
                </label>
                <div className="mb-3">
                  <div className="position-relative" style={{ width: '100%' }}>
                    <FaEnvelope
                      className="position-absolute top-50 translate-middle-y"
                      size={16}
                      style={{ left: 14, color: theme.textSecondary, zIndex: 1 }}
                    />
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="form-control"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      style={inputStyle('email')}
                      {...focusRing}
                    />
                    {(form.email.trim() || fieldErrors.email) && (
                      <span
                        className="position-absolute top-50 translate-middle-y"
                        style={{
                          right: 14,
                          zIndex: 1,
                          pointerEvents: 'none',
                          color:
                            fieldErrors.email ||
                            (form.email && !isValidEmailFormat(form.email))
                              ? '#dc3545'
                              : theme.primary,
                        }}
                        aria-hidden
                      >
                        {fieldErrors.email ||
                        (form.email && !isValidEmailFormat(form.email)) ? (
                          <FaExclamationCircle size={18} title="Invalid" />
                        ) : (
                          <FaCheckCircle size={18} title="Valid" />
                        )}
                      </span>
                    )}
                  </div>
                  {(fieldErrors.email || (form.email && !isValidEmailFormat(form.email))) && (
                    <small className="text-danger d-block mt-1 register-field-error">
                      {fieldErrors.email || 'Please enter a valid email address.'}
                    </small>
                  )}
                </div>

                {/* Section & Unit */}
                <label
                  htmlFor="section_unit"
                  className="mb-1 fw-semibold d-block"
                  style={{ fontSize: '0.9rem', color: theme.textSecondary }}
                >
                  Section & Unit *
                </label>
                <div className="mb-3">
                  <div className="position-relative" style={{ width: '100%' }}>
                    <FaIdCard
                      className="position-absolute"
                      size={16}
                      style={{ left: 14, top: 19, transform: 'translateY(-50%)', color: theme.textSecondary, zIndex: 2 }}
                    />
                    <SearchableSelect
                      id="section_unit"
                      options={SECTION_UNIT_OPTIONS}
                      value={form.section_unit}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, section_unit: val }))
                      }
                      disabled={isSubmitting}
                      invalid={!!fieldErrors.section_unit}
                      placeholder="Search or select Section & Unit..."
                      theme={{
                        primary: theme.primary,
                        borderColor: fieldErrors.section_unit ? '#dc3545' : '#d1d5db',
                        textPrimary: theme.textPrimary,
                      }}
                    />
                  </div>
                  {fieldErrors.section_unit && (
                    <small className="text-danger d-block mt-1 register-field-error">{fieldErrors.section_unit}</small>
                  )}
                </div>

                {/* Designation/Position */}
                <label
                  htmlFor="designation_position"
                  className="mb-1 fw-semibold d-block"
                  style={{ fontSize: '0.9rem', color: theme.textSecondary }}
                >
                  Designation/Position *
                </label>
                <div className="mb-3">
                  <div className="position-relative" style={{ width: '100%' }}>
                    <FaIdCard
                      className="position-absolute"
                      size={16}
                      style={{ left: 14, top: 19, transform: 'translateY(-50%)', color: theme.textSecondary, zIndex: 2 }}
                    />
                    <SearchableSelect
                      id="designation_position"
                      options={DESIGNATION_POSITION_OPTIONS}
                      value={form.designation_position}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, designation_position: val }))
                      }
                      disabled={isSubmitting}
                      invalid={!!fieldErrors.designation_position}
                      placeholder="Search or select Designation/Position..."
                      theme={{
                        primary: theme.primary,
                        borderColor: fieldErrors.designation_position ? '#dc3545' : '#d1d5db',
                        textPrimary: theme.textPrimary,
                      }}
                    />
                  </div>
                  {fieldErrors.designation_position && (
                    <small className="text-danger d-block mt-1 register-field-error">
                      {fieldErrors.designation_position}
                    </small>
                  )}
                </div>

                {/* Password */}
                <label
                  htmlFor="password"
                  className="mb-1 fw-semibold d-block"
                  style={{ fontSize: '0.9rem', color: theme.textSecondary }}
                >
                  Password *
                </label>
                <div className="mb-2">
                  <div className="position-relative" style={{ width: '100%' }}>
                    <FaLock
                      className="position-absolute top-50 translate-middle-y"
                      size={16}
                      style={{ left: 14, color: theme.textSecondary, zIndex: 1 }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      onFocus={() => setShowPasswordCriteria(true)}
                      required
                      minLength={8}
                      disabled={isSubmitting}
                      id="password"
                      className="form-control"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleInputChange}
                      style={inputStyle('password')}
                      {...focusRing}
                    />
                    {(form.password || fieldErrors.password) && (
                      <span
                        className="position-absolute top-50 translate-middle-y"
                        style={{
                          right: 36,
                          zIndex: 1,
                          pointerEvents: 'none',
                          color:
                            fieldErrors.password ||
                            !(
                              passwordValidation.minLength &&
                              passwordValidation.hasLetter &&
                              passwordValidation.hasNumber
                            )
                              ? '#dc3545'
                              : theme.primary,
                        }}
                        aria-hidden
                      >
                        {fieldErrors.password ||
                        !(
                          passwordValidation.minLength &&
                          passwordValidation.hasLetter &&
                          passwordValidation.hasNumber
                        ) ? (
                          <FaExclamationCircle size={18} title="Invalid" />
                        ) : (
                          <FaCheckCircle size={18} title="Valid" />
                        )}
                      </span>
                    )}
                    <span
                      onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                      className="position-absolute top-50 translate-middle-y"
                      style={{
                        right: 14,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        color: theme.textSecondary,
                        zIndex: 1,
                      }}
                    >
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </span>
                  </div>
                  {fieldErrors.password && (
                    <small className="text-danger d-block mt-1 register-field-error">{fieldErrors.password}</small>
                  )}
                </div>

                {/* Password criteria: always in DOM so open/close can transition */}
                <div
                  className={`register-password-criteria-wrapper ${showPasswordCriteria ? 'open' : ''}`}
                >
                  <div
                    className="register-password-criteria mb-3"
                    style={{
                      backgroundColor: 'rgba(12, 138, 59, 0.08)',
                      border: `1px solid ${theme.borderColor}`,
                      color: theme.textSecondary,
                    }}
                  >
                    <div className={`register-password-criteria-item ${passwordValidation.minLength ? 'text-success' : ''}`}>
                      • At least 8 characters
                    </div>
                    <div className={`register-password-criteria-item ${passwordValidation.hasLetter ? 'text-success' : ''}`}>
                      • Contains a letter
                    </div>
                    <div className={`register-password-criteria-item ${passwordValidation.hasNumber ? 'text-success' : ''}`}>
                      • Contains a number
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 fw-semibold d-block"
                  style={{ fontSize: '0.9rem', color: theme.textSecondary }}
                >
                  Confirm Password *
                </label>
                <div className="mb-4">
                  <div className="position-relative" style={{ width: '100%' }}>
                    <FaLock
                      className="position-absolute top-50 translate-middle-y"
                      size={16}
                      style={{ left: 14, color: theme.textSecondary, zIndex: 1 }}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      id="confirmPassword"
                      className="form-control"
                      placeholder="Confirm Password"
                      value={form.confirmPassword}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      style={inputStyle('confirmPassword')}
                      {...focusRing}
                    />
                    {(form.confirmPassword || fieldErrors.confirmPassword) && (
                      <span
                        className="position-absolute top-50 translate-middle-y"
                        style={{
                          right: 36,
                          zIndex: 1,
                          pointerEvents: 'none',
                          color:
                            fieldErrors.confirmPassword ||
                            (form.confirmPassword && form.confirmPassword !== form.password)
                              ? '#dc3545'
                              : theme.primary,
                        }}
                        aria-hidden
                      >
                        {fieldErrors.confirmPassword ||
                        (form.confirmPassword && form.confirmPassword !== form.password) ? (
                          <FaExclamationCircle size={18} title="Invalid" />
                        ) : (
                          <FaCheckCircle size={18} title="Valid" />
                        )}
                      </span>
                    )}
                    <span
                      onClick={() =>
                        !isSubmitting && setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="position-absolute top-50 translate-middle-y"
                      style={{
                        right: 14,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        color: theme.textSecondary,
                        zIndex: 1,
                      }}
                    >
                      {showConfirmPassword ? (
                        <FaEyeSlash size={16} />
                      ) : (
                        <FaEye size={16} />
                      )}
                    </span>
                  </div>
                  {(fieldErrors.confirmPassword ||
                    (form.confirmPassword && form.confirmPassword !== form.password)) && (
                    <small className="text-danger d-block mt-1 register-field-error">
                      {fieldErrors.confirmPassword || 'Passwords do not match.'}
                    </small>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-100 py-2 fw-semibold border-0 rounded shadow-sm d-flex align-items-center justify-content-center"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.backgroundWhite,
                    fontSize: '1rem',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(12, 138, 59, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = theme.primaryDark
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(12, 138, 59, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = theme.primary
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(12, 138, 59, 0.3)'
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(12, 138, 59, 0.3)'
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="fa-spin me-2" size={18} />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <p
                className="auth-form-register-wrap text-center mb-0 mt-4"
                style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.primary }}
              >
                Already have an account?{' '}
                <Link to="/login" className="auth-form-link auth-form-link--signin">
                  Sign in here
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-link p-0 mb-3 d-flex align-items-center gap-2"
                style={{ color: theme.primary, fontWeight: 600, textDecoration: 'none' }}
                onClick={() => {
                  setStep('form')
                  setOtpError('')
                  setOtpDigits(['', '', '', '', '', ''])
                }}
              >
                <FaArrowLeft size={16} />
                Back to sign up
              </button>

              <h5
                className="text-center fw-bold mb-2"
                style={{ color: theme.primary, fontSize: '1.35rem' }}
              >
                Verify your email
              </h5>
              <p
                className="text-center mb-4"
                style={{ fontSize: '0.9rem', color: theme.textSecondary }}
              >
                Enter the 6-digit code we sent to{' '}
                <strong style={{ color: theme.textPrimary }}>{form.email || 'your email'}</strong>.
              </p>

              <form onSubmit={handleOtpVerify} className="w-100">
                <div className="d-flex justify-content-center gap-2 mb-3 flex-wrap">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className="form-control text-center fw-bold"
                      style={{
                        width: 'clamp(36px, 10vw, 48px)',
                        height: 48,
                        fontSize: '1.25rem',
                        border: otpError
                          ? '2px solid #dc3545'
                          : `2px solid ${theme.borderColor}`,
                        borderRadius: '8px',
                      }}
                    />
                  ))}
                </div>
                {otpError && (
                  <div className="text-center text-danger mb-3 small">{otpError}</div>
                )}

                <button
                  type="submit"
                  className="w-100 py-2 fw-semibold border-0 rounded shadow-sm d-flex align-items-center justify-content-center mb-2"
                  disabled={verifyLoading}
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.backgroundWhite,
                    fontSize: '1rem',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(12, 138, 59, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (!verifyLoading) {
                      e.currentTarget.style.backgroundColor = theme.primaryDark
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(12, 138, 59, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!verifyLoading) {
                      e.currentTarget.style.backgroundColor = theme.primary
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(12, 138, 59, 0.3)'
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!verifyLoading) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(12, 138, 59, 0.3)'
                    }
                  }}
                >
                  {verifyLoading ? (
                    <>
                      <FaSpinner className="fa-spin me-2" size={18} />
                      Verifying...
                    </>
                  ) : (
                    'Verify email'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    style={{
                      color: theme.primary,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                    }}
                    disabled={resendCooldown > 0}
                    onClick={handleResendOtp}
                  >
                    {resendLoading
                      ? 'Sending...'
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend code'}
                  </button>
                </div>
              </form>

              <p
                className="auth-form-register-wrap text-center mb-0 mt-4"
                style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.primary }}
              >
                Already have an account?{' '}
                <Link to="/login" className="auth-form-link auth-form-link--signin">
                  Sign in here
                </Link>
              </p>
            </>
          )}
          </div>
        </div>
      </div>

      <style>{`
        /* ===== Layout: panels visible immediately. Form card animates from above, same as login page. ===== */
        .register-page.auth-layout {
          height: 100vh;
          min-height: 100vh;
          display: flex;
          overflow: hidden;
        }
        .register-page.auth-layout .register-form-card {
          opacity: 0;
          transform: translateY(-20px);
        }
        .register-page.auth-layout.register-page-enter .register-form-card {
          animation: register-form-fade 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
        @keyframes register-form-fade {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* ===== Auth layout panels (static – no transition) ===== */
        .register-auth-left.auth-left {
          flex: 1 1 0;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .register-auth-right.auth-right {
          flex: 1 1 0;
          min-height: 0;
          position: relative;
          overflow-y: auto;
          overflow-x: hidden;
          background: linear-gradient(
            135deg,
            #e8f5ec 0%,
            #dceee2 20%,
            #eef9f1 40%,
            #d4ead9 60%,
            #e4f0e7 80%,
            #e8f5ec 100%
          );
          background-size: 300% 300%;
          animation: register-auth-bg-gradient 12s ease-in-out infinite;
        }
        .register-auth-right.auth-right::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image:
            linear-gradient(rgba(12, 138, 59, 0.26) 1px, transparent 1px),
            linear-gradient(90deg, rgba(12, 138, 59, 0.26) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          animation: register-auth-grid-shift 8s linear infinite;
        }
        .register-auth-right.auth-right::after {
          content: "";
          position: absolute;
          z-index: 0;
          width: 90%;
          height: 90%;
          max-width: 500px;
          max-height: 500px;
          top: 50%;
          left: 50%;
          margin: auto;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse at center,
            rgba(12, 138, 59, 0.12) 0%,
            rgba(12, 138, 59, 0.04) 40%,
            transparent 70%
          );
          pointer-events: none;
          animation: register-auth-orb-pulse 8s ease-in-out infinite;
        }
        .register-auth-right.auth-right > * {
          position: relative;
          z-index: 1;
        }
        @keyframes register-auth-bg-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes register-auth-grid-shift {
          0%, 100% { opacity: 1; transform: translate(0, 0); }
          50% { opacity: 0.85; transform: translate(2px, 2px); }
        }
        @keyframes register-auth-orb-pulse {
          0%, 100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @media (max-width: 991.98px) {
          .register-page.auth-layout {
            flex-direction: column;
          }
          .register-auth-left.auth-left {
            display: none;
          }
          .register-auth-right.auth-right {
            flex: 1 1 auto;
          }
        }
        .register-auth-right-inner {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
        }
        .register-form-card {
          width: 100%;
          max-width: 520px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(12, 138, 59, 0.12);
          padding: 2rem 1.75rem;
        }
        .register-form-select {
          display: block;
          max-width: 100%;
        }
        .register-form-select option {
          background: #fff;
          color: #1a2a1a;
          padding: 0.5rem 0.75rem;
          font-size: 1rem;
        }
        .register-form-select:focus {
          outline: none;
        }
        .register-form-select:hover:not(:disabled):not(:focus) {
          border-color: #0C8A3B;
        }
        .register-form-select:hover:not(:disabled):not(:focus) {
          border-color: #0C8A3B;
        }
        /* Sign in here link: same as Login's Register here – no underline by default, smooth underline on hover */
        .register-page .auth-form-link {
          text-decoration: none !important;
          cursor: pointer;
          position: relative;
          padding-bottom: 1px;
          transition: color 0.25s ease-in-out, transform 0.25s ease-in-out;
        }
        .register-page .auth-form-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 0;
          background-color: currentColor;
          transition: width 0.25s ease-in-out;
        }
        .register-page .auth-form-link:hover::after {
          width: 100%;
        }
        .register-page .auth-form-link--signin {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0C8A3B;
          letter-spacing: 0.01em;
        }
        .register-page .auth-form-link--signin:hover {
          color: #0A6B2E;
          transform: translateY(-1px);
        }
        .register-page .auth-form-register-wrap {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0C8A3B;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}

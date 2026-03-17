import React, { useState, useEffect } from 'react'
import {
  FaUser,
  FaSpinner,
  FaLock,
  FaSave,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/apiClient'
import { showToast } from '../services/notificationService'
import SearchableSelect from '../components/SearchableSelect'
import './Profile.css'
import './admin/Settings.css'

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

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    section_unit: '',
    designation_position: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  })
  const [profileErrors, setProfileErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  })
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        section_unit: user.section_unit || '',
        designation_position: user.designation_position || '',
      })
    }
  }, [user])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
    if (profileErrors[name]) setProfileErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))

    if (name === 'new_password') {
      if (value.length > 0) setShowPasswordCriteria(true)
      const validation = {
        minLength: value.length >= 8,
        hasLetter: /[A-Za-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
      }
      setPasswordValidation(validation)
    }

    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validatePassword = (pwd) => {
    if (!pwd) return false
    const validation = {
      minLength: pwd.length >= 8,
      hasLetter: /[A-Za-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    }
    setPasswordValidation(validation)
    return validation.minLength && validation.hasLetter && validation.hasNumber
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!profileForm.name?.trim()) next.name = 'Name is required.'
    setProfileErrors(next)
    if (Object.keys(next).length > 0) return

    setProfileLoading(true)
    try {
      const res = await apiRequest('/user/profile', {
        method: 'PUT',
        auth: true,
        body: {
          name: profileForm.name.trim(),
          section_unit: profileForm.section_unit.trim() || null,
          designation_position: profileForm.designation_position.trim() || null,
        },
      })
      if (res?.user) await refreshUser()
      showToast.success('Profile updated successfully.')
    } catch (err) {
      const msg =
        err?.data?.errors
          ? Object.values(err.data.errors).flat().join(' ')
          : err?.message || 'Failed to update profile.'
      showToast.error(msg)
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!passwordForm.current_password) next.current_password = 'Current password is required.'
    if (!passwordForm.new_password) next.new_password = 'New password is required.'
    else if (!validatePassword(passwordForm.new_password)) {
      next.new_password =
        'Password must be at least 8 characters and include a letter and a number.'
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      next.new_password_confirmation = 'Passwords do not match.'
    }
    setPasswordErrors(next)
    if (Object.keys(next).length > 0) return

    setPasswordLoading(true)
    try {
      await apiRequest('/user/password', {
        method: 'PUT',
        auth: true,
        body: {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
          new_password_confirmation: passwordForm.new_password_confirmation,
        },
      })
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      })
      setPasswordErrors({})
      setPasswordValidation({ minLength: false, hasLetter: false, hasNumber: false })
      setShowPasswordCriteria(false)
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      showToast.success('Password changed successfully.')
    } catch (err) {
      const msg =
        err?.data?.errors?.current_password?.[0] ||
        (err?.data?.errors ? Object.values(err.data.errors).flat().join(' ') : null) ||
        err?.message ||
        'Failed to change password.'
      showToast.error(msg)
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!user) return null

  // Profile is for personnel (non-admin). Admin uses Settings.
  if (user.role === 'admin') {
    return <Navigate to="/admin/settings" replace />
  }

  return (
    <div className="system-settings-container page-enter profile-settings-container">
      <div className="system-settings-header">
        <div className="system-settings-header-icon-wrap profile-settings-avatar-wrap" aria-hidden="true">
          <FaUser className="profile-settings-avatar-placeholder" />
        </div>
        <div className="system-settings-header-text">
          <h1 className="system-settings-header-title">My profile</h1>
          <p className="system-settings-header-subtitle">
            {user?.name || 'User'} • {user?.email || '—'}
          </p>
          <p className="system-settings-header-desc">
            Review and maintain your account information and access credentials for system access.
          </p>
        </div>
      </div>

      <div className="system-settings-row">
        <div className="system-settings-card system-settings-card-left">
          <h2 className="system-settings-menu-title">Profile Menu</h2>
          <nav className="system-settings-nav">
            <button
              type="button"
              className={`system-settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <FaUser className="system-settings-nav-icon" aria-hidden="true" />
              <div className="system-settings-nav-text">
                <span className="system-settings-nav-label">Account information</span>
                <span className="system-settings-nav-desc">Update your profile details</span>
              </div>
            </button>
            <button
              type="button"
              className={`system-settings-nav-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FaLock className="system-settings-nav-icon" aria-hidden="true" />
              <div className="system-settings-nav-text">
                <span className="system-settings-nav-label">Security</span>
                <span className="system-settings-nav-desc">Change your password</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="system-settings-card system-settings-card-right">
          <div className="system-settings-content-body">
            {activeTab === 'account' && (
              <div className="system-settings-tab-panel tab-transition-enter">
                <h2 className="system-settings-card-title">
                  <FaUser className="system-settings-card-title-icon" aria-hidden="true" />
                  <span>Account information</span>
                </h2>

                <div className="system-settings-admin-note">
                  <strong>Note:</strong> Your email address is used for authentication and cannot be
                  changed.
                </div>

                <form onSubmit={handleProfileSubmit} className="system-settings-form">
                  <div className="profile-settings-grid">
                    <div className="system-settings-form-group">
                      <label htmlFor="profile-name" className="system-settings-label">
                        Full name <span className="system-settings-required">*</span>
                      </label>
                      <input
                        id="profile-name"
                        name="name"
                        type="text"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className={`system-settings-input ${profileErrors.name ? 'error' : ''}`}
                        disabled={profileLoading}
                        maxLength={255}
                        placeholder="Enter your full name"
                      />
                      {profileErrors.name && (
                        <p className="system-settings-error">{profileErrors.name}</p>
                      )}
                    </div>

                    <div className="system-settings-form-group profile-settings-form-group-readonly">
                      <label htmlFor="profile-email" className="system-settings-label">
                        Email{' '}
                        <span className="profile-settings-readonly-hint">(cannot be changed)</span>
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={user.email || ''}
                        readOnly
                        aria-readonly="true"
                        className="system-settings-input profile-settings-input-readonly"
                      />
                    </div>

                    <div className="system-settings-form-group profile-settings-searchable-wrap">
                      <label htmlFor="profile-section-unit" className="system-settings-label">
                        Section / Unit
                      </label>
                      <SearchableSelect
                        id="profile-section-unit"
                        options={SECTION_UNIT_OPTIONS}
                        value={profileForm.section_unit}
                        onChange={(val) =>
                          setProfileForm((prev) => ({ ...prev, section_unit: val }))
                        }
                        disabled={profileLoading}
                        invalid={!!profileErrors.section_unit}
                        placeholder="Search or select Section & Unit..."
                        inputStyle={{ paddingLeft: 12 }}
                        theme={{
                          primary: 'var(--primary-color, #0d7a3a)',
                          borderColor: profileErrors.section_unit
                            ? '#b91c1c'
                            : 'var(--input-border, #d5dbe6)',
                          textPrimary: 'var(--text-primary, #10172b)',
                        }}
                      />
                      {profileErrors.section_unit && (
                        <p className="system-settings-error">{profileErrors.section_unit}</p>
                      )}
                    </div>

                    <div className="system-settings-form-group profile-settings-searchable-wrap">
                      <label htmlFor="profile-designation" className="system-settings-label">
                        Designation / Position
                      </label>
                      <SearchableSelect
                        id="profile-designation"
                        options={DESIGNATION_POSITION_OPTIONS}
                        value={profileForm.designation_position}
                        onChange={(val) =>
                          setProfileForm((prev) => ({ ...prev, designation_position: val }))
                        }
                        disabled={profileLoading}
                        invalid={!!profileErrors.designation_position}
                        placeholder="Search or select Designation/Position..."
                        inputStyle={{ paddingLeft: 12 }}
                        theme={{
                          primary: 'var(--primary-color, #0d7a3a)',
                          borderColor: profileErrors.designation_position
                            ? '#b91c1c'
                            : 'var(--input-border, #d5dbe6)',
                          textPrimary: 'var(--text-primary, #10172b)',
                        }}
                      />
                      {profileErrors.designation_position && (
                        <p className="system-settings-error">
                          {profileErrors.designation_position}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="system-settings-form-footer">
                    <button
                      type="submit"
                      className="system-settings-btn-primary"
                      disabled={profileLoading}
                      aria-busy={profileLoading}
                    >
                      {profileLoading ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <FaSave aria-hidden="true" />
                          <span>Save changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="system-settings-tab-panel tab-transition-enter">
                <h2 className="system-settings-card-title">
                  <FaLock className="system-settings-card-title-icon" aria-hidden="true" />
                  <span>Security</span>
                </h2>

                <div className="system-settings-admin-note">
                  <strong>Security note:</strong> Use a strong password and do not share your
                  credentials.
                </div>

                <form onSubmit={handlePasswordSubmit} className="system-settings-form">
                  <div className="system-settings-form-group">
                    <label htmlFor="profile-current-password" className="system-settings-label">
                      Current password <span className="system-settings-required">*</span>
                    </label>
                    <div className="input-group mb-2">
                      <span className="input-group-text">
                        <FaLock size={14} />
                      </span>
                      <input
                        id="profile-current-password"
                        name="current_password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.current_password}
                        onChange={handlePasswordChange}
                        autoComplete="current-password"
                        className={`form-control ${
                          passwordErrors.current_password ? 'is-invalid' : ''
                        }`}
                        disabled={passwordLoading}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          !passwordLoading && setShowCurrentPassword(!showCurrentPassword)
                        }
                        disabled={passwordLoading}
                        aria-label={
                          showCurrentPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {passwordErrors.current_password && (
                      <div className="invalid-feedback d-block small mb-2">
                        {passwordErrors.current_password}
                      </div>
                    )}
                  </div>

                  <div className="system-settings-form-group">
                    <label htmlFor="profile-new-password" className="system-settings-label">
                      New password <span className="system-settings-required">*</span>
                    </label>
                    <div className="input-group mb-2">
                      <span className="input-group-text">
                        <FaLock size={14} />
                      </span>
                      <input
                        id="profile-new-password"
                        name="new_password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.new_password}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        className={`form-control border-start-0 ps-2 fw-semibold ${
                          passwordForm.new_password &&
                          passwordValidation.minLength &&
                          passwordValidation.hasLetter &&
                          passwordValidation.hasNumber
                            ? 'is-valid'
                            : passwordForm.new_password
                              ? 'is-invalid'
                              : ''
                        }`}
                        disabled={passwordLoading}
                        placeholder="Create a new password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          !passwordLoading && setShowNewPassword(!showNewPassword)
                        }
                        disabled={passwordLoading}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <div
                      className={`password-criteria-wrapper ${
                        showPasswordCriteria ? 'password-criteria-visible' : ''
                      }`}
                    >
                      <div className="password-criteria-inner">
                        <ul className="password-criteria-content small text-secondary mb-3 ps-3 list-unstyled">
                          <li className={passwordValidation.minLength ? 'text-success' : ''}>
                            • At least 8 characters
                          </li>
                          <li className={passwordValidation.hasLetter ? 'text-success' : ''}>
                            • Contains a letter
                          </li>
                          <li className={passwordValidation.hasNumber ? 'text-success' : ''}>
                            • Contains a number
                          </li>
                        </ul>
                      </div>
                    </div>
                    {passwordErrors.new_password && (
                      <div className="invalid-feedback d-block small mb-2">
                        {passwordErrors.new_password}
                      </div>
                    )}
                  </div>

                  <div className="system-settings-form-group">
                    <label htmlFor="profile-confirm-password" className="system-settings-label">
                      Confirm new password <span className="system-settings-required">*</span>
                    </label>
                    <div className="input-group mb-1">
                      <span className="input-group-text">
                        <FaLock size={14} />
                      </span>
                      <input
                        id="profile-confirm-password"
                        name="new_password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.new_password_confirmation}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        className={`form-control ${
                          passwordErrors.new_password_confirmation ? 'is-invalid' : ''
                        }`}
                        disabled={passwordLoading}
                        placeholder="Confirm new password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          !passwordLoading &&
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={passwordLoading}
                        aria-label={
                          showConfirmPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {passwordErrors.new_password_confirmation && (
                      <div className="invalid-feedback d-block small mb-3">
                        {passwordErrors.new_password_confirmation}
                      </div>
                    )}
                  </div>

                  <div className="system-settings-form-footer">
                    <button
                      type="submit"
                      className="system-settings-btn-primary"
                      disabled={passwordLoading}
                      aria-busy={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <FaSpinner className="spinner" aria-hidden="true" />
                          <span>Changing…</span>
                        </>
                      ) : (
                        <>
                          <FaLock aria-hidden="true" />
                          <span>Change password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

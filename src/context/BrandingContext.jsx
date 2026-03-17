import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { buildStorageUrl, normalizeLogoUrl } from '../services/apiClient'
import systemLogoFallback from '../assets/system_logo.png'

const API_BASE = import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'

const BrandingContext = createContext({
  appName: 'ATIn e-Track System',
  logoUrl: null,
  authBackgroundUrl: null,
  brandingLoaded: false,
  refreshBranding: () => {},
})

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    appName: 'ATIn e-Track System',
    logoUrl: null,
    authBackgroundUrl: null,
  })
  const [brandingLoaded, setBrandingLoaded] = useState(false)

  const loadBranding = useCallback(async () => {
    try {
      const apiBase = API_BASE.replace(/\/?$/, '')
      const url = `${apiBase}/settings`
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
      })
      if (!res.ok) return
      const data = await res.json()
      // Prefer storage path so frontend builds URL from API base (works in production with /atin-server etc.)
      const logoBase = data?.logo_path
        ? buildStorageUrl(data.logo_path)
        : (data?.logo_url ? normalizeLogoUrl(data.logo_url) : null)
      const bgBase = data?.auth_background_path
        ? buildStorageUrl(data.auth_background_path)
        : (data?.auth_background_url ? normalizeLogoUrl(data.auth_background_url) : null)
      setBranding({
        appName: data?.app_name || 'ATIn e-Track System',
        logoUrl: logoBase ? `${logoBase}?t=${Date.now()}` : null,
        authBackgroundUrl: bgBase ? `${bgBase}?t=${Date.now()}` : null,
      })
      setBrandingLoaded(true)
    } catch {
      // keep defaults on failure
      setBrandingLoaded(true)
    }
  }, [])

  const refreshBranding = useCallback(() => {
    loadBranding()
  }, [loadBranding])

  useEffect(() => {
    loadBranding()

    const handler = (e) => {
      const d = e?.detail || {}
      const next = {}
      const logoBase = d.logo_path ? buildStorageUrl(d.logo_path) : (d.logoUrl ? normalizeLogoUrl(d.logoUrl) : null)
      if (logoBase) next.logoUrl = `${logoBase}?t=${Date.now()}`
      const bgBase = d.auth_background_path ? buildStorageUrl(d.auth_background_path) : (d.authBackgroundUrl ? normalizeLogoUrl(d.authBackgroundUrl) : null)
      if (bgBase) next.authBackgroundUrl = `${bgBase}?t=${Date.now()}`
      if (Object.keys(next).length) {
        setBranding((prev) => ({ ...prev, ...next }))
        setBrandingLoaded(true)
      }
      loadBranding()
    }

    const onTabVisible = () => {
      if (document.visibilityState === 'visible') loadBranding()
    }

    window.addEventListener('atin-settings-updated', handler)
    document.addEventListener('visibilitychange', onTabVisible)

    return () => {
      window.removeEventListener('atin-settings-updated', handler)
      document.removeEventListener('visibilitychange', onTabVisible)
    }
  }, [loadBranding])

  const value = {
    appName: branding.appName,
    logoUrl: branding.logoUrl || systemLogoFallback,
    authBackgroundUrl: branding.authBackgroundUrl,
    brandingLoaded,
    refreshBranding,
  }

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  return useContext(BrandingContext)
}


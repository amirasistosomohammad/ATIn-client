import React from 'react'

const FOOTER_TAGLINE = 'Agricultural Training Institute — Regional Training Center IX'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-3 bg-light mt-auto">
      <div className="container-fluid">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between small">
          <span className="text-muted">
            &copy; {currentYear} ATIn e-Track System. {FOOTER_TAGLINE}. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer

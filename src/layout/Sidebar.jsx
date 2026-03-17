// Copied from DATravelApp-client – same structure, ATIn menu only
import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ onCloseSidebar }) => {
  const { user } = useAuth()
  const location = useLocation()

  const isActiveLink = (href) => {
    const normalize = (p) => (p || '').replace(/\/+$/, '') || '/'
    const current = normalize(location.pathname)
    const target = normalize(href)
    return current === target
  }

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768 && onCloseSidebar) onCloseSidebar()
  }

  const isAdmin = user?.role === 'admin'

  const menuSections = [
    {
      heading: 'CORE',
      items: [
        { icon: 'fas fa-tachometer-alt', label: 'Dashboard', href: '/dashboard' },
        { icon: 'fas fa-search', label: 'Track by Control Number', href: '/track' },
      ],
    },
    // Personnel documents area (create and manage control numbers)
    ...(!isAdmin
      ? [
          {
            heading: 'DOCUMENTS',
            items: [
              { icon: 'fas fa-folder-open', label: 'My Documents', href: '/documents' },
              { icon: 'fas fa-plus-circle', label: 'Register Control Number', href: '/documents/register' },
            ],
          },
          {
            heading: 'ACCOUNT',
            items: [
              { icon: 'fas fa-user', label: 'Profile', href: '/profile' },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            heading: 'ADMIN',
            items: [
              { icon: 'fas fa-users', label: 'User management', href: '/admin/users' },
              { icon: 'fas fa-list-alt', label: 'Document types', href: '/admin/document-types' },
              { icon: 'fas fa-cog', label: 'Settings', href: '/admin/settings' },
            ],
          },
          {
            heading: 'REPORTS',
            items: [
              { icon: 'fas fa-chart-bar', label: 'Reports', href: '/reports' },
            ],
          },
        ]
      : []),
  ]

  return (
    <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
      <div className="sb-sidenav-menu">
        {menuSections.map((section) => (
          <React.Fragment key={section.heading}>
            <div className="sb-sidenav-menu-heading">{section.heading}</div>
            <ul className="nav">
              {section.items.map((item) => {
                const isActive = isActiveLink(item.href)
                return (
                  <li className="nav-item" key={item.href}>
                    <Link
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      to={item.href}
                      onClick={closeSidebarOnMobile}
                    >
                      <i className={`sb-nav-link-icon ${item.icon}`} />
                      <span className="sb-nav-link-label">{item.label}</span>
                      {isActive && (
                        <i className="fas fa-chevron-right sb-nav-link-arrow" aria-hidden />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </React.Fragment>
        ))}
      </div>
      <div className="sb-sidenav-footer">
        <div className="small">Logged in as</div>
        <div className="user-name">{user?.name || user?.email || 'User'}</div>
        <div className="small text-white-50">
          {user?.role === 'admin'
            ? 'System Administrator'
            : 'Personnel'}
        </div>
      </div>
    </nav>
  )
}

export default Sidebar

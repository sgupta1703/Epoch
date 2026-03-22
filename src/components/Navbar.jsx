import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isTeacher = user?.role === 'teacher';
  const dashboardPath = isTeacher ? '/teacher' : '/student';

  // Build breadcrumb from path
  function getBreadcrumb() {
    const parts = location.pathname.split('/').filter(Boolean);
    // e.g. ['teacher', 'classroom', '123', 'unit', '456']
    if (parts.length <= 1) return null;
    if (parts.includes('classroom') && !parts.includes('unit')) return 'Classroom';
    if (parts.includes('unit')) {
      const tab = parts[parts.length - 1];
      if (tab === 'notes') return 'Notes';
      if (tab === 'personas') return 'Personas';
      if (tab === 'quiz') return 'Quiz';
      return 'Unit';
    }
    return null;
  }

  const breadcrumb = getBreadcrumb();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function handleBack() {
    navigate(-1);
  }

  const showBack = location.pathname.split('/').filter(Boolean).length > 1;

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Left: brand + back */}
        <div className="navbar-left">
          {showBack && (
            <button className="navbar-back-btn" onClick={handleBack} title="Go back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
          )}
          <Link to={dashboardPath} className="navbar-brand">
            <span className="navbar-brand-text">Epoch</span>
          </Link>
          {breadcrumb && (
            <>
              <span className="navbar-breadcrumb-sep">/</span>
              <span className="navbar-breadcrumb">{breadcrumb}</span>
            </>
          )}
        </div>

        {/* Center: role badge */}


        {/* Right: user */}
        <div className="navbar-right" ref={dropdownRef}>
          {user && (
            <>
              <span className="navbar-user-name">{user.display_name}</span>
              <button
                className={`navbar-avatar${menuOpen ? ' navbar-avatar--open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="User menu"
              >
                {user.display_name?.[0]?.toUpperCase()}
              </button>
            </>
          )}

          {menuOpen && (
            <div className="navbar-dropdown">
              <div className="navbar-dropdown-header">
                <div className="navbar-dropdown-avatar">
                  {user?.display_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="navbar-dropdown-name">{user?.display_name}</p>
                  <p className="navbar-dropdown-role">{isTeacher ? 'Teacher' : 'Student'}</p>
                </div>
              </div>
              <div className="navbar-dropdown-divider" />
              <Link
                to={dashboardPath}
                className="navbar-dropdown-item"
                onClick={() => setMenuOpen(false)}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                  <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
                </svg>
                Dashboard
              </Link>
              <div className="navbar-dropdown-divider" />
              <button
                className="navbar-dropdown-item navbar-dropdown-logout"
                onClick={handleLogout}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/><path d="M11 11l3-3-3-3"/><path d="M14 8H6"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
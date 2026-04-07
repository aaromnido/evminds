import { useEffect, useState } from 'react';
import { MenuIcon } from './icons/MenuIcon';

function MobileThemeToggle({ isClosing, delay }: { isClosing: boolean; delay: number }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const handleClick = () => {
    const themeApi = (window as any).__evminds_theme;
    if (themeApi) {
      const next = themeApi.toggle();
      setIsDark(next === 'dark');
    }
  };

  return (
    <button
      className={`mobile-menu-theme-toggle mobile-menu-item ${isClosing ? 'mobile-menu-item--closing' : ''}`}
      onClick={handleClick}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{ animationDelay: isClosing ? '0s' : `${delay}s` }}
    >
      {isDark ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
}

interface MobileMenuProps {
  navItems: NavItem[];
}

export function MobileMenu({ navItems }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  const closeMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="mobile-menu-button"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
      >
        <MenuIcon isOpen={isOpen} />
      </button>

      {/* Fullscreen Menu Overlay */}
      {isOpen && (
        <div
          className={`mobile-menu-overlay ${isClosing ? 'mobile-menu-overlay--closing' : ''}`}
          onClick={closeMenu}
        >
          <nav
            className="mobile-menu-nav"
            onClick={(e) => e.stopPropagation()}
            aria-label="Navegación móvil"
          >
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={`mobile-menu-item ${item.active ? 'mobile-menu-item--active' : ''} ${isClosing ? 'mobile-menu-item--closing' : ''}`}
                onClick={closeMenu}
                style={{
                  animationDelay: isClosing ? '0s' : `${index * 0.1}s`,
                }}
              >
                {item.label}
                {item.badge && <span className="nav__badge">{item.badge}</span>}
              </a>
            ))}
            <MobileThemeToggle
              isClosing={isClosing}
              delay={navItems.length * 0.1}
            />
          </nav>
        </div>
      )}

      <style>{`
        .mobile-menu-button {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--navy-2);
          transition: opacity 0.2s;
          z-index: 1001;
        }

        .mobile-menu-button:hover {
          opacity: 0.7;
        }

        .mobile-menu-button:active {
          opacity: 0.5;
        }

        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: var(--sepia-light);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-menu-overlay--closing {
          animation: fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .mobile-menu-nav {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          width: 100%;
          padding: 48px 24px;
        }

        .mobile-menu-item {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 32px;
          font-weight: 500;
          color: var(--navy-2);
          text-decoration: none;
          position: relative;
          opacity: 0;
          transform: translateY(20px);
          animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          transition: transform 0.2s, text-decoration-color 0.2s;
          text-decoration: underline;
          text-decoration-color: transparent;
          text-decoration-thickness: 2px;
          text-underline-offset: 8px;
        }

        .mobile-menu-item--closing {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }

        .mobile-menu-item:hover {
          text-decoration-color: var(--navy-2);
        }

        .mobile-menu-item:active {
          transform: scale(0.95);
        }

        .mobile-menu-item--active {
          text-decoration-color: var(--navy-2);
        }

        .mobile-menu-theme-toggle {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--navy-2);
          padding: 8px;
          border-radius: 50%;
          transition: opacity 0.2s;
        }

        .mobile-menu-theme-toggle:hover {
          opacity: 0.7;
        }

        /* Show mobile menu button only on mobile */
        @media (max-width: 768px) {
          .mobile-menu-button {
            display: block;
          }
        }
      `}</style>
    </>
  );
}

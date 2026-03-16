import { useEffect, useState } from 'react';
import { MenuIcon } from './icons/MenuIcon';

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
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
              </a>
            ))}
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

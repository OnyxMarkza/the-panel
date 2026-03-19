import React, { useEffect, useState } from 'react';

/**
 * Header — Fixed 56px bar at the top of the app.
 *
 * Left:  "The Panel" logotype
 * Right: settings icon button, "New Debate" button
 * Mobile: hamburger toggles the sidebar
 *
 * Picks up a subtle drop-shadow once the page is scrolled.
 */
export default function Header({ onNewDebate, onToggleSidebar, onOpenSettings }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Watch the main-content scroll container, not window, because window
    // doesn't scroll in a flex layout where overflow sits on a child element.
    // Fallback: also watch window.
    function handleScroll() {
      setScrolled(window.scrollY > 4);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      {/* Hamburger — visible on mobile only (CSS hides it on desktop) */}
      <button
        className="header__hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <HamburgerIcon />
      </button>

      {/* Logo */}
      <div className="header__logo">The Panel</div>

      {/* Right-hand controls */}
      <div className="header__actions">
        <button
          className="header__btn"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon />
        </button>

        <button
          className="header__btn header__btn--primary"
          onClick={onNewDebate}
          aria-label="Start a new debate"
        >
          <span className="header__btn--new-label">New Debate</span>
          {/* Arrow shown when the label is hidden on mobile */}
          <span aria-hidden="true" style={{ marginLeft: '0.3rem' }}>+</span>
        </button>
      </div>
    </header>
  );
}

/* ── Inline SVG icons (no external dependency needed) ── */

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="14" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="8.25" width="14" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="12.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

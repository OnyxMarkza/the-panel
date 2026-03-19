import React, { useEffect, useState } from 'react';

/**
 * StatusBar — A thin strip showing the current app state.
 *
 * Slides down into view when a status message appears and fades out
 * when cleared. The activity dot pulses smoothly while isActive is true.
 */
export default function StatusBar({ status, isActive }) {
  // Track visibility separately so we can animate out before unmounting
  const [visible, setVisible] = useState(false);
  const [displayedStatus, setDisplayedStatus] = useState('');

  useEffect(() => {
    if (status) {
      setDisplayedStatus(status);
      setVisible(true);
    } else {
      // Fade out, then clear text after animation completes
      setVisible(false);
      const t = setTimeout(() => setDisplayedStatus(''), 300);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!displayedStatus) return null;

  return (
    <div
      style={{
        ...styles.bar,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
      }}
      role="status"
      aria-live="polite"
    >
      {isActive && <span style={styles.dot} aria-hidden="true" />}
      <span style={styles.text}>{displayedStatus}</span>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    padding: '0.45rem 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 50, /* below header (100) but above content */
    transition: 'opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out)',
    animation: 'slideDown 0.25s var(--ease-out)',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--gold)',
    display: 'inline-block',
    flexShrink: 0,
    animation: 'pulse 1.2s ease infinite',
  },
  text: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
};

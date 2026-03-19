import React, { useState } from 'react';

/**
 * PersonaCard — Displays a single panellist's details.
 *
 * Each persona gets a unique accent colour from the CSS variables.
 * Slides in with a staggered fadeInUp animation based on index.
 * On hover, the card's shadow lifts to give a tactile depth effect.
 */
export default function PersonaCard({ persona, index }) {
  const [hovered, setHovered] = useState(false);

  // CSS variable name for this persona's accent colour
  const accentVar = `var(--persona-${index})`;

  // Generate styled initials from the persona's name
  const initials = persona.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        ...styles.card,
        borderLeftColor: accentVar,
        animationDelay: `${index * 120}ms`,
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar: styled initials circle */}
      <div
        style={{
          ...styles.avatar,
          background: accentVar,
          color: '#1a1a1a',
        }}
      >
        {initials}
      </div>

      <div style={styles.details}>
        <div style={{ ...styles.name, color: accentVar }}>{persona.name}</div>
        <div style={styles.archetype}>{persona.archetype}</div>
        <div style={styles.bias}>{persona.bias}</div>
        <div style={styles.tone}>
          <span style={styles.toneLabel}>Tone: </span>
          {persona.tone}
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-md)',
    background: 'var(--gradient-card)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid',
    borderRadius: '8px',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    animation: 'fadeInUp 0.4s var(--ease-out) both',
    transition: 'box-shadow 0.2s var(--ease-out), transform 0.2s var(--ease-out)',
    cursor: 'default',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Playfair Display', serif",
    fontWeight: '700',
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    minWidth: 0,
  },
  name: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: '700',
    fontSize: '1rem',
  },
  archetype: {
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  bias: {
    fontSize: '0.82rem',
    color: 'var(--text-primary)',
    lineHeight: '1.5',
    marginTop: '0.25rem',
  },
  tone: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
  toneLabel: {
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '0.7rem',
  },
};

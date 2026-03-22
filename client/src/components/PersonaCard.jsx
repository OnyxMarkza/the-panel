import React, { useState } from 'react';

/**
 * PersonaCard — Displays a single panellist as a dossier entry.
 *
 * Each persona gets:
 * - A two-digit index badge (01, 02...) in their accent colour
 * - An outlined avatar circle (refined vs. filled)
 * - A classification-style archetype tag
 * - An italic bias statement (reads like a filed position)
 * - A tone label row
 *
 * Slides in with staggered fadeInUp animation based on index.
 */
export default function PersonaCard({ persona, index }) {
  const [hovered, setHovered] = useState(false);

  // CSS variable name for this persona's accent colour
  const accentVar = `var(--persona-${index})`;

  // Subtle background tint using the persona's RGB values
  const accentRgb = ACCENT_RGB[index] ?? '212,168,83';

  // Generate styled initials from the persona's name
  const initials = persona.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Zero-padded index for the dossier badge
  const indexLabel = String(index + 1).padStart(2, '0');

  return (
    <div
      style={{
        ...styles.card,
        borderLeftColor: accentVar,
        animationDelay: `${index * 120}ms`,
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.55)' : '0 2px 8px rgba(0,0,0,0.35)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: index badge + avatar + name block */}
      <div style={styles.topRow}>
        <div style={{ ...styles.indexBadge, color: accentVar }}>
          {indexLabel}
        </div>

        {/* Outlined avatar — more refined than a filled circle */}
        <div style={{ ...styles.avatar, color: accentVar, borderColor: accentVar }}>
          {initials}
        </div>

        <div style={styles.nameBlock}>
          <div style={{ ...styles.name, color: accentVar }}>{persona.name}</div>
          {/* Archetype as a classification-style tag */}
          <div
            style={{
              ...styles.archetype,
              color: accentVar,
              borderColor: accentVar,
              background: `rgba(${accentRgb}, 0.07)`,
            }}
          >
            {persona.archetype}
          </div>
        </div>
      </div>

      {/* Thin accent rule separating identity from position */}
      <div style={{ ...styles.rule, background: accentVar }} />

      {/* Bias — presented as an italic position statement */}
      <p style={styles.bias}>{persona.bias}</p>

      {/* Tone label */}
      <div style={styles.toneRow}>
        <span style={styles.toneLabel}>Tone</span>
        <span style={styles.tone}>{persona.tone}</span>
      </div>
    </div>
  );
}

// RGB values matching the --persona-N CSS variables, used for rgba() tints
const ACCENT_RGB = [
  '226,179,64',   // amber   (--persona-0)
  '78,205,196',   // teal    (--persona-1)
  '255,107,107',  // coral   (--persona-2)
  '116,185,255',  // sky     (--persona-3)
  '168,224,108',  // lime    (--persona-4)
];

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    background: 'var(--gradient-card)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid',
    borderRadius: '6px',
    padding: 'var(--spacing-md)',
    animation: 'fadeInUp 0.4s var(--ease-out) both',
    transition: 'box-shadow 0.22s var(--ease-out), transform 0.22s var(--ease-out)',
    cursor: 'default',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
  },
  indexBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    fontWeight: '500',
    letterSpacing: '0.04em',
    opacity: 0.5,
    paddingTop: '0.1rem',
    flexShrink: 0,
    minWidth: '18px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    fontSize: '0.88rem',
    flexShrink: 0,
    opacity: 0.85,
  },
  nameBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: 0,
  },
  name: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    fontSize: '1.05rem',
    lineHeight: '1.1',
  },
  archetype: {
    display: 'inline-flex',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '0.15rem 0.45rem',
    border: '1px solid',
    borderRadius: '2px',
    opacity: 0.85,
    alignSelf: 'flex-start',
  },
  rule: {
    height: '1px',
    opacity: 0.18,
  },
  bias: {
    fontFamily: "'Inter', sans-serif",

    fontSize: '0.92rem',
    lineHeight: '1.55',
    color: 'var(--text-primary)',
    opacity: 0.9,
  },
  toneRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  toneLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    flexShrink: 0,
  },
  tone: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
};

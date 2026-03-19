import React from 'react';

/**
 * SummaryPanel — Displays the moderator's synthesis and verdict.
 * Slides in after all debate rounds are complete.
 *
 * Summary box: subtle gradient background, refined shadow.
 * Verdict box: gold-tinted gradient, gold border, shadow lift.
 */
export default function SummaryPanel({ summary, verdict }) {
  if (!summary) return null;

  return (
    <div style={styles.wrapper}>
      {/* Decorative divider with label */}
      <div style={styles.header}>
        <div style={styles.rule} />
        <span style={styles.label}>Moderator's Synthesis</span>
        <div style={styles.rule} />
      </div>

      <div style={styles.summaryBox}>
        <h3 style={styles.sectionHeading}>Summary</h3>
        <p style={styles.text}>{summary}</p>
      </div>

      {verdict && (
        <div style={styles.verdictBox}>
          <h3 style={{ ...styles.sectionHeading, color: 'var(--gold-dim)' }}>Verdict</h3>
          <p style={{ ...styles.text, color: 'var(--gold)' }}>{verdict}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
    animation: 'fadeInUp 0.5s var(--ease-out) both',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
  },
  rule: {
    flex: 1,
    height: '1px',
    background: 'var(--gold)',
    opacity: 0.3,
  },
  label: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    color: 'var(--gold)',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    letterSpacing: '0.02em',
  },
  summaryBox: {
    background: 'var(--gradient-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: 'var(--spacing-lg)',
    boxShadow: 'var(--shadow-md)',
  },
  verdictBox: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(212, 168, 83, 0.06) 100%)',
    border: '1px solid var(--gold-dim)',
    borderRadius: '8px',
    padding: 'var(--spacing-lg)',
    boxShadow: 'var(--shadow-md)',
  },
  sectionHeading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 'var(--spacing-sm)',
    fontWeight: '400',
  },
  text: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.875rem',
    lineHeight: '1.7',
    color: 'var(--text-primary)',
  },
};

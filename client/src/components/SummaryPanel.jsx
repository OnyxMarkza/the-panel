import React from 'react';

/**
 * SummaryPanel — Displays the moderator's synthesis and verdict.
 * Slides in after all debate rounds are complete.
 *
 * Summary box: subtle card background, italic Cormorant Garamond text.
 * Verdict box: gold-tinted, with a decorative heading row and larger type.
 */
export default function SummaryPanel({ summary, verdict }) {
  if (!summary) return null;

  return (
    <div style={styles.wrapper}>
      {/* Decorative divider with centred label */}
      <div style={styles.header}>
        <div style={styles.rule} />
        <span style={styles.label}>Moderator's Synthesis</span>
        <div style={styles.rule} />
      </div>

      {/* Summary */}
      <div style={styles.summaryBox}>
        <div style={styles.sectionHeading}>Summary</div>
        <p style={styles.text}>{summary}</p>
      </div>

      {/* Verdict */}
      {verdict && (
        <div style={styles.verdictBox}>
          <div style={styles.verdictHeadingRow}>
            {/* Decorative diamond marks flank the heading */}
            <span style={styles.verdictIcon} aria-hidden="true">&#9670;</span>
            <span style={styles.verdictHeading}>Verdict</span>
            <span style={styles.verdictIcon} aria-hidden="true">&#9670;</span>
          </div>
          <p style={styles.verdictText}>{verdict}</p>
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
    opacity: 0.25,
  },
  label: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontStyle: 'italic',
    color: 'var(--gold)',
    fontSize: '1rem',
    whiteSpace: 'nowrap',
    letterSpacing: '0.02em',
    opacity: 0.85,
  },
  summaryBox: {
    background: 'var(--gradient-card)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: 'var(--spacing-lg)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
  },
  verdictBox: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(212, 168, 83, 0.07) 100%)',
    border: '1px solid rgba(212, 168, 83, 0.38)',
    borderRadius: '6px',
    padding: 'var(--spacing-lg)',
    boxShadow: '0 4px 20px rgba(212, 168, 83, 0.08)',
  },
  sectionHeading: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    marginBottom: 'var(--spacing-sm)',
  },
  verdictHeadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: 'var(--spacing-sm)',
  },
  verdictIcon: {
    color: 'var(--gold)',
    fontSize: '0.5rem',
    opacity: 0.45,
  },
  verdictHeading: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: 'var(--gold-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  },
  text: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '1.05rem',
    lineHeight: '1.72',
    color: 'var(--text-primary)',
  },
  verdictText: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '1.12rem',
    lineHeight: '1.65',
    color: 'var(--gold)',
    letterSpacing: '0.01em',
  },
};

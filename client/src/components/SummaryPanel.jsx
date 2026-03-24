import React, { useState } from 'react';

/**
 * SummaryPanel — Displays the moderator's synthesis and verdict.
 * Slides in after all debate rounds are complete.
 */
export default function SummaryPanel({ summary, verdict, debateId }) {
  const [copyStatus, setCopyStatus] = useState('');

  if (!summary) return null;

  async function handleShareClick() {
    if (!debateId) return;

    const shareUrl = `${window.location.origin}/debate/${debateId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch (_err) {
      setCopyStatus('failed');
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.rule} />
        <span style={styles.label}>Moderator's Synthesis</span>
        <div style={styles.rule} />
      </div>

      <div style={styles.summaryBox}>
        <div style={styles.sectionHeadingRow}>
          <div style={styles.sectionHeading}>Summary</div>
          <button
            type="button"
            style={{
              ...styles.shareButton,
              ...(debateId ? null : styles.shareButtonDisabled),
            }}
            onClick={handleShareClick}
            disabled={!debateId}
          >
            Share this debate
          </button>
        </div>
        {copyStatus === 'copied' && (
          <div style={styles.copyState}>Link copied!</div>
        )}
        {copyStatus === 'failed' && (
          <div style={styles.copyError}>Unable to copy link.</div>
        )}
        <p style={styles.text}>{summary}</p>
      </div>

      {verdict && (
        <div style={styles.verdictBox}>
          <div style={styles.verdictHeadingRow}>
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
    fontFamily: "'Inter', sans-serif",
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
  sectionHeadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-sm)',
    flexWrap: 'wrap',
  },
  verdictBox: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(226, 179, 64, 0.07) 100%)',
    border: '1px solid rgba(226, 179, 64, 0.38)',
    borderRadius: '6px',
    padding: 'var(--spacing-lg)',
    boxShadow: '0 4px 20px rgba(226, 179, 64, 0.08)',
  },
  sectionHeading: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  },
  shareButton: {
    border: '1px solid var(--gold-dim)',
    background: 'transparent',
    color: 'var(--gold)',
    borderRadius: '4px',
    padding: '0.35rem 0.55rem',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  shareButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  copyState: {
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--gold)',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 'var(--spacing-sm)',
  },
  copyError: {
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--danger)',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
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
    fontFamily: "'Inter', sans-serif",
    fontSize: '1.05rem',
    lineHeight: '1.72',
    color: 'var(--text-primary)',
  },
  verdictText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1.12rem',
    lineHeight: '1.65',
    color: 'var(--gold)',
    letterSpacing: '0.01em',
  },
};

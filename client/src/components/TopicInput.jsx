import React, { useState } from 'react';

/**
 * TopicInput — The opening screen within the main content area.
 * Full-width input with a gold animated border on focus.
 * On submit, calls the parent's onSubmit handler with the topic string.
 */
export default function TopicInput({ onSubmit, isLoading }) {
  const [topic, setTopic] = useState('');
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  }

  const isDisabled = isLoading || !topic.trim();

  return (
    <div style={styles.wrapper}>
      {/* Masthead */}
      <div style={styles.masthead}>
        <h1 style={styles.title}>The Panel</h1>
        <p style={styles.subtitle}>
          Enter a topic. Five minds will convene. The debate begins.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Input wrapper — border turns gold on focus */}
        <div
          style={{
            ...styles.inputWrapper,
            borderColor: focused ? 'var(--gold)' : 'var(--border)',
            boxShadow: focused ? 'var(--shadow-gold)' : 'none',
            backdropFilter: 'blur(4px)',
          }}
        >
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Should artificial intelligence replace human doctors?"
            disabled={isLoading}
            style={styles.input}
            aria-label="Debate topic"
          />
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...styles.button,
            opacity:    isDisabled ? 0.45 : 1,
            cursor:     isDisabled ? 'not-allowed' : 'pointer',
            transform:  hovered && !isDisabled ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow:  hovered && !isDisabled ? 'var(--shadow-gold)' : 'none',
          }}
        >
          {isLoading ? 'Convening the panel...' : 'Convene the Panel \u2192'}
        </button>
      </form>

      <p style={styles.hint}>
        Powered by Groq &middot; LLaMA 3.3 70B &middot; Saved to Obsidian
      </p>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - var(--header-height) - 4rem)',
    padding: 'var(--spacing-xl)',
    gap: 'var(--spacing-xl)',
    animation: 'fadeInUp 0.5s var(--ease-out) both',
  },
  masthead: {
    textAlign: 'center',
  },
  title: {
    /* Global h1 styles apply; override size here for the landing logotype */
    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
    color: 'var(--gold)',
    letterSpacing: '0.04em',
    marginBottom: 'var(--spacing-xs)',
  },
  subtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    letterSpacing: '0.05em',
    lineHeight: '1.6',
  },
  form: {
    width: '100%',
    maxWidth: '720px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  inputWrapper: {
    border: '1px solid',
    borderRadius: '6px',
    background: 'var(--bg-card)',
    transition: 'border-color 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out)',
    padding: '12px 16px',
  },
  input: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '1rem',
    lineHeight: '1.6',
  },
  button: {
    background: 'var(--gold)',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontFamily: "'Playfair Display', serif",
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.03em',
    alignSelf: 'flex-end',
    transition: 'opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out)',
  },
  hint: {
    color: 'var(--text-muted)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
};

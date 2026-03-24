import React, { useState } from 'react';

const MAX_TOPIC_LENGTH = 100;
const FALLBACK_TOPICS = [
  'Should social media platforms verify all users by default?',
  'Should AI-generated media require visible watermarking?',
  'Should cities make public transit free for all residents?',
  'Should universities ban laptops in lecture halls?',
  'Should governments cap weekly work at four days?',
];

/**
 * TopicInput — The opening screen within the main content area.
 *
 * On submit, calls the parent's onSubmit handler with the topic string and
 * selected persona count.
 */
export default function TopicInput({ onSubmit, isLoading, defaultPersonaCount = 5 }) {
  const [topic, setTopic] = useState('');
  const [personaCount, setPersonaCount] = useState(defaultPersonaCount);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const PERSONA_COUNT_OPTIONS = [3, 4, 5, 6, 7];

  function handleTopicChange(e) {
    const value = e.target.value;
    if (value.length <= MAX_TOPIC_LENGTH) {
      setTopic(value);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const normalizedTopic = topic.trim();
    const safeCount = Number.isInteger(personaCount) ? personaCount : defaultPersonaCount;

    if (normalizedTopic && !isLoading) {
      onSubmit(normalizedTopic, safeCount);
    }
  }

  async function handleSurpriseMe() {
    if (isSuggesting) return;

    setIsSuggesting(true);
    setSuggestionsError('');
    setSuggestions([]);

    try {
      const res = await fetch('/api/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: topic.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok || data.error || !Array.isArray(data.topics)) {
        throw new Error(data.message || 'Unable to load suggestions right now.');
      }

      setSuggestions(data.topics.slice(0, 5));
    } catch (err) {
      setSuggestions(FALLBACK_TOPICS);
      setSuggestionsError('Could not fetch live suggestions. Here are a few debate starters instead.');
      console.error('[TopicInput] suggest-topics failed:', err.message);
    } finally {
      setIsSuggesting(false);
    }
  }

  const isDisabled = isLoading || !topic.trim();
  const charCount = topic.length;
  const isNearLimit = charCount > 80;

  return (
    <div style={styles.wrapper}>
      <div style={styles.crest} aria-hidden="true">
        <CrestSVG />
      </div>

      <div style={styles.masthead}>
        <div style={styles.eyebrow}>Est. In Dispute</div>
        <h1 style={styles.title}>The Panel</h1>
        <div style={styles.ornament} aria-hidden="true">* --- *</div>
        <p style={styles.subtitle}>
          Enter a topic. Set the panel size. The debate begins.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form} aria-busy={isLoading}>
        <div style={styles.inputLabel}>State your proposition</div>

        <div
          style={{
            ...styles.inputWrapper,
            borderColor: focused ? 'var(--gold)' : 'var(--border)',
            boxShadow: focused
              ? '0 0 0 1px var(--gold), 0 4px 24px rgba(226, 179, 64, 0.12)'
              : 'none',
          }}
        >
          <input
            type="text"
            value={topic}
            onChange={handleTopicChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Should artificial intelligence replace human doctors?"
            disabled={isLoading}
            style={styles.input}
            maxLength={MAX_TOPIC_LENGTH}
            aria-label="Debate topic"
          />
          <div
            style={{
              ...styles.charCounter,
              color: isNearLimit ? 'var(--gold)' : 'var(--text-muted)',
            }}
            aria-live="polite"
          >
            {charCount}/{MAX_TOPIC_LENGTH}
          </div>
        </div>

        <div style={styles.rangeWrapper}>
          <div style={styles.rangeLabelRow}>
            <span style={styles.rangeLabel}>Panel size</span>
            <span style={styles.rangeValue}>{personaCount}</span>
          </div>
          <input
            type="range"
            min="3"
            max="7"
            step="1"
            value={personaCount}
            onChange={(e) => setPersonaCount(Number(e.target.value))}
            disabled={isLoading}
            aria-label="Persona count"
            style={styles.rangeInput}
          />
          <div style={styles.rangeTicks}>
            <span>3</span>
            <span>7</span>
          </div>
        </div>

        <div style={styles.actionsRow}>
          <button
            type="button"
            disabled={isLoading || isSuggesting}
            onClick={handleSurpriseMe}
            style={{
              ...styles.ghostButton,
              opacity: isLoading || isSuggesting ? 0.55 : 1,
              cursor: isLoading || isSuggesting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSuggesting ? 'Finding ideas...' : 'Surprise Me'}
          </button>

          <button
            type="submit"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-label={isLoading ? 'Convene panel in progress' : 'Convene the panel'}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              ...styles.button,
              opacity: isDisabled ? 0.4 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transform: hovered && !isDisabled ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hovered && !isDisabled
                ? '0 6px 24px rgba(226, 179, 64, 0.35)'
                : '0 2px 10px rgba(226, 179, 64, 0.12)',
            }}
          >
            {isLoading ? 'Convening the panel...' : 'Convene the Panel \u2192'}
          </button>
        </div>
      </form>

      {(isSuggesting || suggestions.length > 0 || suggestionsError) && (
        <section style={styles.suggestionsPanel} aria-live="polite">
          <div style={styles.suggestionsHeader}>Topic ideas</div>

          {isSuggesting && (
            <div style={styles.skeletonGrid}>
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} style={styles.skeletonCard} />
              ))}
            </div>
          )}

          {!isSuggesting && suggestionsError && (
            <p style={styles.errorText}>{suggestionsError}</p>
          )}

          {!isSuggesting && suggestions.length > 0 && (
            <div style={styles.chipsGrid}>
              {suggestions.map((idea, idx) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setTopic(idea)}
                  style={{
                    ...styles.chip,
                    animationDelay: `${idx * 80}ms`,
                  }}
                >
                  {idea}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div style={styles.meta}>
        <span>Groq</span>
        <span style={styles.metaDot}>&middot;</span>
        <span>LLaMA 3.3 70B</span>
        <span style={styles.metaDot}>&middot;</span>
        <span>Saved to Obsidian</span>
      </div>
    </div>
  );
}

function CrestSVG() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="36" cy="36" r="34" stroke="var(--gold)" strokeWidth="0.75" opacity="0.45" />
      <circle cx="36" cy="36" r="28" stroke="var(--gold)" strokeWidth="0.5" opacity="0.25" />
      <line x1="36" y1="2" x2="36" y2="8" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <line x1="36" y1="64" x2="36" y2="70" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <line x1="2" y1="36" x2="8" y2="36" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <line x1="64" y1="36" x2="70" y2="36" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <text
        x="36"
        y="45"
        textAnchor="middle"
        fontFamily="'Inter', sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="var(--gold)"
        letterSpacing="4"
      >
        TP
      </text>
    </svg>
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
    gap: 'var(--spacing-md)',
    animation: 'fadeInUp 0.6s var(--ease-out) both',
  },
  crest: {
    marginBottom: 'var(--spacing-xs)',
    opacity: 0.88,
  },
  masthead: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.3rem',
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    letterSpacing: '0.24em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  title: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
    color: 'var(--gold)',
    letterSpacing: '-0.02em',
    lineHeight: '1',
    marginTop: '0.1rem',
  },
  ornament: {
    color: 'var(--gold)',
    opacity: 0.3,
    fontSize: '0.62rem',
    letterSpacing: '0.5em',
    marginTop: '0.25rem',
  },
  subtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
    lineHeight: '1.65',
    marginTop: 'var(--spacing-xs)',
  },
  form: {
    width: '100%',
    maxWidth: '680px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    marginTop: 'var(--spacing-md)',
  },
  inputLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    letterSpacing: '0.2em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: '0.15rem',
  },
  inputWrapper: {
    border: '1px solid',
    borderRadius: '3px',
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'border-color 0.2s var(--ease-out), box-shadow 0.3s var(--ease-out)',
    padding: '14px 18px',
    position: 'relative',
  },
  input: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '1.15rem',
    lineHeight: '1.5',
    paddingRight: '64px',
  },
  charCounter: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    fontWeight: '500',
    transition: 'color 0.2s var(--ease-out)',
  },
  rangeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    margin: '0.2rem 0 0.45rem',
  },
  rangeLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rangeLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  rangeValue: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    color: 'var(--gold)',
    fontWeight: '600',
  },
  rangeInput: {
    width: '100%',
    accentColor: 'var(--gold)',
    cursor: 'pointer',
  },
  rangeTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    opacity: 0.75,
    letterSpacing: '0.08em',
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--spacing-xs)',
    gap: 'var(--spacing-sm)',
  },
  ghostButton: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '3px',
    padding: '12px 14px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    transition: 'border-color 0.2s var(--ease-out), color 0.2s var(--ease-out)',
  },
  button: {
    background: 'var(--gold)',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '3px',
    padding: '12px 28px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    fontWeight: '500',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    transition: 'opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out)',
  },
  suggestionsPanel: {
    width: '100%',
    maxWidth: '680px',
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '4px',
    padding: '14px',
    marginTop: 'var(--spacing-xs)',
  },
  suggestionsHeader: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    letterSpacing: '0.2em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
  },
  skeletonCard: {
    height: '44px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.2s linear infinite',
  },
  chipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
  },
  chip: {
    textAlign: 'left',
    border: '1px solid rgba(226, 179, 64, 0.35)',
    color: 'var(--text-secondary)',
    background: 'rgba(226, 179, 64, 0.06)',
    padding: '10px 12px',
    borderRadius: '999px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.88rem',
    lineHeight: '1.3',
    cursor: 'pointer',
    animation: 'fadeInUp 0.35s var(--ease-out) both',
    transition: 'border-color 0.2s var(--ease-out), transform 0.2s var(--ease-out)',
  },
  errorText: {
    margin: '2px 0 12px',
    color: 'var(--text-muted)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    lineHeight: '1.5',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    color: 'var(--text-muted)',
    opacity: 0.7,
    marginTop: 'var(--spacing-sm)',
  },
  metaDot: {
    opacity: 0.5,
  },
};

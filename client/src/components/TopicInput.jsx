import React, { useState } from 'react';

const MAX_TOPIC_LENGTH = 100;
const FALLBACK_TOPICS = [
  'Should social media platforms verify all users by default?',
  'Should AI-generated media require visible watermarking?',
  'Should cities make public transit free for all residents?',
  'Should universities ban laptops in lecture halls?',
  'Should governments cap weekly work at four days?',
];

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
    if (value.length <= MAX_TOPIC_LENGTH) setTopic(value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const normalizedTopic = topic.trim();
    const safeCount = Number.isInteger(personaCount) ? personaCount : defaultPersonaCount;
    if (normalizedTopic && !isLoading) onSubmit(normalizedTopic, safeCount);
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
      <div style={styles.masthead}>
        <div style={styles.eyebrow}>Est. In Dispute</div>
        <h1 style={styles.title}>The Panel</h1>
        <p style={styles.subtitle}>Enter a topic. Set the panel size. The debate begins.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputLabel}>State your proposition</div>
        <div style={{ ...styles.inputWrapper, borderColor: focused ? 'var(--gold)' : 'var(--border)' }}>
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
          />
          <div style={{ ...styles.charCounter, color: isNearLimit ? 'var(--gold)' : 'var(--text-muted)' }}>
            {charCount}/{MAX_TOPIC_LENGTH}
          </div>
        </div>

        <label style={styles.selectLabel} htmlFor="persona-count-select">Panel size</label>
        <select
          id="persona-count-select"
          value={personaCount}
          onChange={(e) => setPersonaCount(Number(e.target.value))}
          disabled={isLoading}
          style={styles.select}
        >
          {PERSONA_COUNT_OPTIONS.map((countOption) => (
            <option key={countOption} value={countOption}>{countOption} panellists</option>
          ))}
        </select>

        <div style={styles.actionsRow}>
          <button type="button" disabled={isLoading || isSuggesting} onClick={handleSurpriseMe} style={styles.ghostButton}>
            {isSuggesting ? 'Finding ideas...' : 'Surprise Me'}
          </button>
          <button
            type="submit"
            disabled={isDisabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ ...styles.button, transform: hovered && !isDisabled ? 'translateY(-2px)' : 'translateY(0)', opacity: isDisabled ? 0.45 : 1 }}
          >
            {isLoading ? 'Convening the panel...' : 'Convene the Panel →'}
          </button>
        </div>
      </form>

      {suggestionsError && <p style={styles.error}>{suggestionsError}</p>}
      {suggestions.length > 0 && (
        <div style={styles.suggestionsWrap}>
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" style={styles.suggestionChip} onClick={() => setTopic(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' },
  masthead: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' },
  title: { fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' },
  subtitle: { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  inputLabel: { fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', fontSize: '0.72rem' },
  inputWrapper: { border: '1px solid var(--border)', borderRadius: '4px', padding: '0.6rem 0.7rem' },
  input: { width: '100%', background: 'transparent', color: 'var(--text-primary)', border: 0, outline: 0, fontFamily: "'Inter', sans-serif" },
  charCounter: { textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem' },
  selectLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--text-muted)' },
  select: { width: '100%', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem' },
  actionsRow: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' },
  button: { border: '1px solid var(--gold)', background: 'var(--gold)', color: 'var(--bg-main)', borderRadius: '4px', padding: '0.5rem 0.75rem', cursor: 'pointer' },
  ghostButton: { border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '4px', padding: '0.5rem 0.75rem', cursor: 'pointer' },
  error: { margin: 0, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', fontSize: '0.72rem' },
  suggestionsWrap: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  suggestionChip: { border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '999px', padding: '0.3rem 0.6rem', cursor: 'pointer' },
};

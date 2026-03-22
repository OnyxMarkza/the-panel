import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * DebateThread — Scrolling transcript of the debate.
 *
 * Each message is attributed to a persona with their unique accent colour.
 * New messages appear with a typewriter effect (character by character).
 * Entries animate in with staggered 60ms delays.
 * The thread auto-scrolls to the latest message.
 */

const PERSONA_COLOURS = [
  'var(--persona-0)',
  'var(--persona-1)',
  'var(--persona-2)',
  'var(--persona-3)',
  'var(--persona-4)',
];

/**
 * TypewriterMessage — Renders a single message with a typewriter effect.
 * Pre-existing messages (isNew = false) display immediately.
 */
function TypewriterMessage({ content, colour, isNew }) {
  const [displayed, setDisplayed] = useState(isNew ? '' : content);

  useEffect(() => {
    if (!isNew) {
      setDisplayed(content);
      return;
    }

    let index = 0;
    const speed = 12; // ms per character

    const interval = setInterval(() => {
      index += 1;
      setDisplayed(content.slice(0, index));
      if (index >= content.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [content, isNew]);

  return (
    <span style={{ ...styles.messageText, borderLeftColor: colour }}>
      {displayed}
      {/* Blinking cursor while typing */}
      {displayed.length < content.length && (
        <span style={styles.cursor} aria-hidden="true">|</span>
      )}
    </span>
  );
}

export default function DebateThread({ history, personas, typingIndex, currentRound, totalRounds }) {
  const bottomRef = useRef(null);

  // Build name -> colour and name -> archetype maps from the personas array.
  // Wrapped in useMemo so they're only recalculated if the personas array changes,
  // not on every render triggered by new messages arriving.
  const colourMap = useMemo(() => {
    const map = {};
    personas.forEach((p, i) => {
      map[p.name] = PERSONA_COLOURS[i] ?? 'var(--text-primary)';
    });
    return map;
  }, [personas]);

  const archetypeMap = useMemo(() => {
    const map = {};
    personas.forEach((p) => {
      map[p.name] = p.archetype;
    });
    return map;
  }, [personas]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Debate Transcript</h2>

      {/* Progress indicator */}
      {currentRound > 0 && currentRound <= totalRounds && (
        <div style={styles.progressContainer}>
          <div style={styles.progressLabel}>
            Round {currentRound} of {totalRounds}
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${(currentRound / totalRounds) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      <div style={styles.thread}>
        {history.map((msg, i) => {
          const colour = colourMap[msg.persona] ?? 'var(--text-primary)';
          const isNew = i === typingIndex;

          return (
            <div
              key={`${msg.persona}-${i}`}
              style={{
                ...styles.entry,
                animationDelay: `${i * 60}ms`,
              }}
            >
              {/* Persona label with professional title */}
              <div style={styles.speakerRow}>
                <span style={{ ...styles.speaker, color: colour }}>
                  {msg.persona}
                </span>
                {archetypeMap[msg.persona] && (
                  <span style={styles.speakerTitle}>
                    ({archetypeMap[msg.persona]})
                  </span>
                )}
              </div>

              {/* Message body */}
              <TypewriterMessage
                content={msg.content}
                colour={colour}
                isNew={isNew}
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
    animation: 'fadeIn 0.4s var(--ease-out)',
  },
  heading: {
    fontFamily: "'Inter', sans-serif",

    fontSize: '1.15rem',
    color: 'var(--gold)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 'var(--spacing-xs)',
    opacity: 0.85,
  },
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem', /* 2rem gap between messages as specified */
  },
  entry: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    animation: 'fadeInUp 0.35s var(--ease-out) both',
  },
  speakerRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  speaker: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    fontSize: '1rem',
    letterSpacing: '0.02em',
    lineHeight: '1.2',
  },
  speakerTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
    opacity: 0.7,
  },
  messageText: {
    display: 'block',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.875rem',
    lineHeight: '1.7',
    color: 'var(--text-primary)',
    borderLeft: '2px solid',
    paddingLeft: '0.85rem',
    whiteSpace: 'pre-wrap',
  },
  cursor: {
    display: 'inline-block',
    animation: 'pulse 0.9s ease infinite',
    color: 'var(--gold)',
    marginLeft: '1px',
  },
  progressContainer: {
    marginBottom: 'var(--spacing-lg)',
    padding: 'var(--spacing-md)',
    background: 'var(--bg-card)',
    borderRadius: '6px',
    border: '1px solid var(--border)',
  },
  progressLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    marginBottom: 'var(--spacing-xs)',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    background: 'var(--border)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--gold)',
    borderRadius: '2px',
    transition: 'width 0.3s var(--ease-out)',
  },
};

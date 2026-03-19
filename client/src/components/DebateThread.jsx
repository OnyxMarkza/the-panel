import React, { useEffect, useRef, useState } from 'react';

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

export default function DebateThread({ history, personas, typingIndex }) {
  const bottomRef = useRef(null);

  // Build a name -> colour map from the personas array
  const colourMap = {};
  personas.forEach((p, i) => {
    colourMap[p.name] = PERSONA_COLOURS[i] ?? 'var(--text-primary)';
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Debate Transcript</h2>

      <div style={styles.thread}>
        {history.map((msg, i) => {
          const colour = colourMap[msg.persona] ?? 'var(--text-primary)';
          const isNew = i === typingIndex;

          return (
            <div
              key={i}
              style={{
                ...styles.entry,
                animationDelay: `${i * 60}ms`,
              }}
            >
              {/* Persona label */}
              <div style={{ ...styles.speaker, color: colour }}>
                {msg.persona}
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
    /* Global h2 styles apply (Playfair Display, 2rem) — override here for compactness */
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem',
    color: 'var(--gold)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 'var(--spacing-xs)',
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
  speaker: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: '700',
    fontSize: '0.9rem',
    letterSpacing: '0.03em',
    lineHeight: '1.2',
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
};

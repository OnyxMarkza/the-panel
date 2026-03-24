import React, { memo, useEffect, useMemo, useRef, useState } from 'react';

const PERSONA_COLOURS = [
  'var(--persona-0)',
  'var(--persona-1)',
  'var(--persona-2)',
  'var(--persona-3)',
  'var(--persona-4)',
  'var(--persona-5)',
  'var(--persona-6)',
];

const TypewriterMessage = memo(function TypewriterMessage({ content, colour, isNew }) {
  const safeContent = typeof content === 'string' ? content : '';
  const [displayed, setDisplayed] = useState(isNew ? '' : safeContent);

  useEffect(() => {
    if (!isNew) {
      setDisplayed(safeContent);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setDisplayed(safeContent.slice(0, index));
      if (index >= safeContent.length) clearInterval(interval);
    }, 12);

    return () => clearInterval(interval);
  }, [safeContent, isNew]);

  return (
    <span style={{ ...styles.messageText, borderLeftColor: colour }}>
      {displayed}
      {displayed.length < safeContent.length && (
        <span style={styles.cursor} aria-hidden="true">|</span>
      )}
    </span>
  );
});

function DebateThread({ history, personas, typingIndex, currentRound, totalRounds }) {
  const bottomRef = useRef(null);

  const { colourMap, archetypeMap } = useMemo(() => {
    const colours = {};
    const archetypes = {};

    personas.forEach((p, i) => {
      const fallbackName = `Panelist ${i + 1}`;
      const name = typeof p?.name === 'string' && p.name.trim() ? p.name : fallbackName;
      colours[name] = PERSONA_COLOURS[i] ?? 'var(--text-primary)';
      archetypes[name] = typeof p?.archetype === 'string' ? p.archetype : '';
    });

    return { colourMap: colours, archetypeMap: archetypes };
  }, [personas]);

  const normalizedHistory = useMemo(
    () => history
      .filter((msg) => msg && typeof msg === 'object')
      .map((msg, i) => ({
        persona: typeof msg.persona === 'string' && msg.persona.trim() ? msg.persona : `Panelist ${i + 1}`,
        content: typeof msg.content === 'string' ? msg.content : '',
      })),
    [history],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [normalizedHistory]);

  if (normalizedHistory.length === 0) {
    return (
      <div style={styles.wrapper}>
        <h2 style={styles.heading}>Debate Transcript</h2>
        <div style={styles.emptyState}>No messages yet.</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Debate Transcript</h2>

      {currentRound > 0 && currentRound <= totalRounds && (
        <div style={styles.progressContainer}>
          <div style={styles.progressLabel}>
            Round {currentRound} of {totalRounds}
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${(currentRound / totalRounds) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div style={styles.thread}>
        {normalizedHistory.map((msg, i) => {
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

export default memo(DebateThread);

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', animation: 'fadeIn 0.4s var(--ease-out)' },
  heading: { fontFamily: "'Inter', sans-serif", fontSize: '1.15rem', color: 'var(--gold)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--spacing-xs)', opacity: 0.85 },
  thread: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  entry: { display: 'flex', flexDirection: 'column', gap: '0.4rem', animation: 'fadeInUp 0.35s var(--ease-out) both' },
  speakerRow: { display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' },
  speaker: { fontFamily: "'Inter', sans-serif", fontWeight: '700', fontSize: '1rem', letterSpacing: '0.02em', lineHeight: '1.2' },
  speakerTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.02em', opacity: 0.7 },
  messageText: { display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--text-primary)', borderLeft: '2px solid', paddingLeft: '0.85rem', whiteSpace: 'pre-wrap' },
  cursor: { display: 'inline-block', animation: 'pulse 0.9s ease infinite', color: 'var(--gold)', marginLeft: '1px' },
  progressContainer: { marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' },
  progressLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 'var(--spacing-xs)', textAlign: 'center' },
  progressBar: { width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--gold)', borderRadius: '2px', transition: 'width 0.3s var(--ease-out)' },
  emptyState: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-muted)' },
};

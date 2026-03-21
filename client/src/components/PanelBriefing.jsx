import React, { useState } from 'react';

/**
 * PanelBriefing — A "dossier" summary shown before the debate begins.
 *
 * For each panellist, displays:
 *   - Their name and professional title
 *   - A plain-English summary of their stance
 *   - Key relationships/dynamics with the other panellists
 *
 * This helps the reader follow who is likely to agree, clash, or surprise.
 */

const PERSONA_COLOURS = [
  'var(--persona-0)',
  'var(--persona-1)',
  'var(--persona-2)',
  'var(--persona-3)',
  'var(--persona-4)',
];

export default function PanelBriefing({ personas }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // If personas don't have the new stance/relationships fields, don't render
  if (!personas.length || !personas[0].stance) return null;

  // Build a name -> colour lookup so relationship names can be tinted
  const colourByName = {};
  personas.forEach((p, i) => {
    colourByName[p.name] = PERSONA_COLOURS[i] ?? 'var(--text-primary)';
  });

  function toggleExpand(index) {
    setExpandedIndex(prev => (prev === index ? null : index));
  }

  return (
    <section style={styles.wrapper}>
      <h3 style={styles.heading}>Panel Briefing</h3>
      <p style={styles.subtitle}>
        Each panellist's position and how they relate to one another.
      </p>

      <div style={styles.list}>
        {personas.map((persona, index) => {
          const colour = PERSONA_COLOURS[index] ?? 'var(--text-primary)';
          const isExpanded = expandedIndex === index;
          const relationships = persona.relationships ?? [];

          return (
            <div
              key={persona.name}
              style={{
                ...styles.card,
                borderLeftColor: colour,
                animationDelay: `${index * 80}ms`,
              }}
            >
              {/* Header row — clickable to expand relationships */}
              <button
                onClick={() => toggleExpand(index)}
                style={styles.cardButton}
                aria-expanded={isExpanded}
              >
                <div style={styles.cardHeader}>
                  <span style={{ ...styles.name, color: colour }}>
                    {persona.name}
                  </span>
                  <span style={styles.archetype}>
                    {persona.archetype}
                  </span>
                </div>

                {/* Stance summary */}
                <p style={styles.stance}>{persona.stance}</p>

                {/* Expand hint */}
                {relationships.length > 0 && (
                  <span style={styles.expandHint}>
                    {isExpanded ? 'Hide relationships' : `${relationships.length} key dynamics`}
                    <span style={{
                      ...styles.chevron,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                      ▾
                    </span>
                  </span>
                )}
              </button>

              {/* Relationships — shown when expanded */}
              {isExpanded && relationships.length > 0 && (
                <div style={styles.relationships}>
                  {relationships.map((rel) => (
                    <div key={rel.name} style={styles.relRow}>
                      <span style={{
                        ...styles.relName,
                        color: colourByName[rel.name] ?? 'var(--text-muted)',
                      }}>
                        {rel.name}
                      </span>
                      <span style={styles.relDynamic}>{rel.dynamic}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  wrapper: {
    animation: 'fadeIn 0.4s var(--ease-out)',
  },
  heading: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '1.15rem',
    color: 'var(--gold)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 'var(--spacing-xs)',
    opacity: 0.85,
    marginBottom: 'var(--spacing-xs)',
  },
  subtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.03em',
    marginBottom: 'var(--spacing-md)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid',
    borderRadius: '4px',
    overflow: 'hidden',
    animation: 'fadeInUp 0.35s var(--ease-out) both',
  },
  cardButton: {
    // Reset button styles so it looks like a div but is accessible
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    width: '100%',
    padding: 'var(--spacing-md)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'inherit',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontWeight: '700',
    fontSize: '1.05rem',
    lineHeight: '1.2',
  },
  archetype: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.62rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  },
  stance: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    color: 'var(--text-primary)',
    opacity: 0.9,
    margin: 0,
  },
  expandHint: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: 'var(--gold)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    opacity: 0.7,
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    marginTop: '0.15rem',
  },
  chevron: {
    display: 'inline-block',
    transition: 'transform 0.2s var(--ease-out)',
    fontSize: '0.7rem',
  },
  relationships: {
    borderTop: '1px solid var(--border)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    animation: 'fadeIn 0.25s var(--ease-out)',
  },
  relRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'baseline',
  },
  relName: {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontWeight: '700',
    fontSize: '0.88rem',
    flexShrink: 0,
    minWidth: '100px',
  },
  relDynamic: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
};

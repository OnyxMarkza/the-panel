import React, { useMemo, useState } from 'react';
import { PERSONA_COLOURS } from '../utils/personaColors.js';

export default function PanelBriefing({ personas }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!Array.isArray(personas) || personas.length === 0 || !personas[0]?.stance) return null;

  const colourByName = useMemo(() => {
    const map = {};
    personas.forEach((p, i) => {
      const safeName = typeof p?.name === 'string' && p.name.trim() ? p.name : `Panellist ${i + 1}`;
      map[safeName] = PERSONA_COLOURS[i] ?? 'var(--text-primary)';
    });
    return map;
  }, [personas]);

  function toggleExpand(index) {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section style={styles.wrapper}>
      <h3 style={styles.heading}>Panel Briefing</h3>
      <p style={styles.subtitle}>Each panellist&apos;s position and likely dynamics.</p>

      <div style={styles.list}>
        {personas.map((persona, index) => {
          const colour = PERSONA_COLOURS[index] ?? 'var(--text-primary)';
          const isExpanded = expandedIndex === index;
          const relationships = Array.isArray(persona.relationships) ? persona.relationships : [];

          return (
            <div key={`${persona.name}-${index}`} style={{ ...styles.card, borderLeftColor: colour, animationDelay: `${index * 80}ms` }}>
              <button type="button" onClick={() => toggleExpand(index)} style={styles.cardButton} aria-expanded={isExpanded}>
                <div style={styles.cardHeader}>
                  <span style={{ ...styles.name, color: colour }}>{persona.name}</span>
                  <span style={styles.archetype}>{persona.archetype}</span>
                </div>

                <p style={styles.stance}>{persona.stance}</p>

                {relationships.length > 0 && (
                  <span style={styles.expandHint}>
                    {isExpanded ? 'Hide relationships' : `${relationships.length} key dynamics`}
                    <span style={{ ...styles.chevron, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </span>
                )}
              </button>

              {isExpanded && relationships.length > 0 && (
                <div style={styles.relationships}>
                  {relationships.map((rel, relIndex) => (
                    <div key={`${rel.name}-${relIndex}`} style={styles.relRow}>
                      <span style={{ ...styles.relName, color: colourByName[rel.name] ?? 'var(--text-muted)' }}>{rel.name}</span>
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
  wrapper: { animation: 'fadeIn 0.4s var(--ease-out)' },
  heading: { fontFamily: "'Inter', sans-serif", fontSize: '1.15rem', color: 'var(--gold)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--spacing-xs)', opacity: 0.85, marginBottom: 'var(--spacing-xs)' },
  subtitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.03em', marginBottom: 'var(--spacing-md)' },
  list: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid', borderRadius: '4px', overflow: 'hidden', animation: 'fadeInUp 0.35s var(--ease-out) both' },
  cardButton: { display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', padding: 'var(--spacing-md)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit' },
  cardHeader: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' },
  name: { fontFamily: "'Inter', sans-serif", fontWeight: '700', fontSize: '1.05rem', lineHeight: '1.2' },
  archetype: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.02em' },
  stance: { fontFamily: "'Inter', sans-serif", fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text-primary)', opacity: 0.9, margin: 0 },
  expandHint: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' },
  chevron: { display: 'inline-block', transition: 'transform 0.2s var(--ease-out)', fontSize: '0.7rem' },
  relationships: { borderTop: '1px solid var(--border)', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.25s var(--ease-out)' },
  relRow: { display: 'flex', flexDirection: 'column', gap: '0.12rem' },
  relName: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  relDynamic: { fontFamily: "'Inter', sans-serif", fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: '1.45' },
};

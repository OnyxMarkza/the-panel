import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PersonaCard from './PersonaCard.jsx';
import DebateThread from './DebateThread.jsx';
import SummaryPanel from './SummaryPanel.jsx';
import PanelBriefing from './PanelBriefing.jsx';

export default function SharedDebateView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDebate() {
      setLoading(true);
      setError('');
      setNotFound(false);

      try {
        const response = await fetch(`/api/debates/${id}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.error) {
          const message = payload?.message || 'Failed to load debate.';
          if (response.status === 404) {
            setNotFound(true);
          } else {
            setError(message);
          }
          return;
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load debate.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDebate();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const personaMap = useMemo(() => {
    if (!data?.personas) return {};
    return data.personas.reduce((map, persona) => {
      map[persona.id] = persona.name;
      return map;
    }, {});
  }, [data]);

  const history = useMemo(() => {
    if (!data?.messages) return [];
    return data.messages.map(msg => ({
      persona: personaMap[msg.persona_id] ?? 'Unknown persona',
      content: msg.content,
    }));
  }, [data, personaMap]);

  if (loading) {
    return (
      <div style={styles.centeredState}>
        <h2 style={styles.stateTitle}>Loading shared debate...</h2>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.centeredState}>
        <h2 style={styles.stateTitle}>Debate not found</h2>
        <p style={styles.stateText}>This link may be expired, invalid, or deleted.</p>
        <Link to="/" style={styles.ctaButton}>Start your own debate</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centeredState}>
        <h2 style={styles.stateTitle}>Unable to load debate</h2>
        <p style={styles.stateText}>{error}</p>
        <Link to="/" style={styles.ctaButton}>Start your own debate</Link>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="main-layout">
        <main className="main-content">
          <div className="debate-content">
            <header style={styles.topicHeader}>
              <div style={styles.topicLabel}>Shared debate</div>
              <h2 style={styles.topicText}>{data.topic}</h2>
            </header>

            {data.personas?.length > 0 && (
              <section>
                <h3 style={styles.sectionHeading}>The Panellists</h3>
                <div style={styles.personaGrid}>
                  {data.personas.map((p, i) => (
                    <PersonaCard key={p.id} persona={p} index={i} />
                  ))}
                </div>
              </section>
            )}

            {data.personas?.length > 0 && (
              <section>
                <PanelBriefing personas={data.personas} />
              </section>
            )}

            {history.length > 0 && (
              <section>
                <DebateThread
                  history={history}
                  personas={data.personas}
                  typingIndex={-1}
                  currentRound={0}
                  totalRounds={0}
                />
              </section>
            )}

            {(data.summary || data.verdict) && (
              <section>
                <SummaryPanel
                  summary={data.summary}
                  verdict={data.verdict}
                  debateId={data.id}
                />
              </section>
            )}

            <div style={styles.ctaWrap}>
              <Link to="/" style={styles.ctaButton}>Start your own debate</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  centeredState: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    textAlign: 'center',
    padding: '2rem',
  },
  stateTitle: {
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text-primary)',
  },
  stateText: {
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-muted)',
  },
  topicHeader: {
    animation: 'fadeIn 0.5s var(--ease-out)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 'var(--spacing-lg)',
  },
  topicLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 'var(--spacing-xs)',
  },
  topicText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 'clamp(1.6rem, 3.8vw, 2.5rem)',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
  },
  sectionHeading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    color: 'var(--gold)',
    marginBottom: 'var(--spacing-md)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: '400',
  },
  personaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 'var(--spacing-sm)',
  },
  ctaWrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 'var(--spacing-md)',
    borderTop: '1px solid var(--border)',
  },
  ctaButton: {
    fontFamily: "'JetBrains Mono', monospace",
    textDecoration: 'none',
    color: 'var(--bg-main)',
    background: 'var(--gold)',
    border: '1px solid var(--gold-dim)',
    borderRadius: '4px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0.5rem 0.75rem',
  },
};

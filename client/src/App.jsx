import React, { useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Footer from './components/Footer.jsx';
import TopicInput from './components/TopicInput.jsx';
import PersonaCard from './components/PersonaCard.jsx';
import DebateThread from './components/DebateThread.jsx';
import SummaryPanel from './components/SummaryPanel.jsx';
import StatusBar from './components/StatusBar.jsx';

/**
 * App — Root component and orchestrator.
 *
 * Layout (always rendered):
 *   <Header>   — fixed 56px bar
 *   <Sidebar>  — collapsible history panel
 *   <main>     — scrollable content area
 *   <Footer>
 *
 * Content flow inside <main>:
 *   1. TopicInput    — user enters a debate topic
 *   2. PersonaCards  — panellists are generated and revealed
 *   3. DebateThread  — rounds stream in with typewriter effect
 *   4. SummaryPanel  — moderator synthesis and verdict
 */

const TOTAL_ROUNDS = 3;

export default function App() {
  // --- Core debate state ---
  const [topic, setTopic]     = useState('');
  const [personas, setPersonas] = useState([]);
  const [history, setHistory]   = useState([]);
  const [summary, setSummary]   = useState('');
  const [verdict, setVerdict]   = useState('');

  // --- UI state ---
  const [status, setStatus]         = useState('');
  const [isActive, setIsActive]     = useState(false);
  const [phase, setPhase]           = useState('input'); // 'input' | 'personas' | 'debate' | 'summary' | 'done'
  const [typingIndex, setTypingIndex] = useState(-1);
  const [savedPath, setSavedPath]   = useState('');

  // --- Layout state ---
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Debate history (current session only, shown in sidebar) ---
  const [debates, setDebates]               = useState([]);
  const [currentDebateId, setCurrentDebateId] = useState(null);

  /**
   * Reset all debate state so the user can start a fresh topic.
   * Called by the Header's "New Debate" button.
   */
  function handleNewDebate() {
    setTopic('');
    setPersonas([]);
    setHistory([]);
    setSummary('');
    setVerdict('');
    setStatus('');
    setSavedPath('');
    setTypingIndex(-1);
    setPhase('input');
  }

  /**
   * Main orchestration function — called when the user submits a topic.
   * Each step is sequential: we await each API call before moving on.
   */
  async function handleTopicSubmit(submittedTopic) {
    setTopic(submittedTopic);
    setPhase('personas');

    // -- Step 1: Generate personas --
    setStatus('Assembling the panel...');
    setIsActive(true);

    let generatedPersonas;
    try {
      const res = await fetch('/api/generate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: submittedTopic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      generatedPersonas = data.personas;
      setPersonas(generatedPersonas);
    } catch (err) {
      setStatus(`Error generating personas: ${err.message}`);
      setIsActive(false);
      return;
    }

    // Brief pause so the user can read the personas before the debate begins
    await delay(1200);

    // -- Step 2: Run 3 debate rounds --
    setPhase('debate');
    let currentHistory = [];

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      setStatus(`Round ${round} of ${TOTAL_ROUNDS} — the panel is deliberating...`);

      try {
        const res = await fetch('/api/debate-round', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personas: generatedPersonas,
            history: currentHistory,
            topic: submittedTopic,
            roundNumber: round,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        // Reveal messages one at a time with enough pause for the typewriter to run
        for (let i = currentHistory.length; i < data.history.length; i++) {
          setTypingIndex(i);
          setHistory([...data.history.slice(0, i + 1)]);
          await delay(data.history[i].content.length * 12 + 400);
        }

        currentHistory = data.history;
      } catch (err) {
        setStatus(`Error in round ${round}: ${err.message}`);
        setIsActive(false);
        return;
      }
    }

    setTypingIndex(-1);

    // -- Step 3: Summarise --
    setStatus('Moderator is synthesising the debate...');
    setPhase('summary');

    let debateSummary, debateVerdict;
    try {
      const res = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: submittedTopic, history: currentHistory }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      debateSummary = data.summary;
      debateVerdict = data.verdict;
      setSummary(debateSummary);
      setVerdict(debateVerdict);
    } catch (err) {
      setStatus(`Error summarising: ${err.message}`);
      setIsActive(false);
      return;
    }

    // -- Step 4: Save to Obsidian --
    setStatus('Writing debate to Obsidian vault...');

    try {
      const res = await fetch('/api/save-to-obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: submittedTopic,
          personas: generatedPersonas,
          history: currentHistory,
          summary: debateSummary,
          verdict: debateVerdict,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      setSavedPath(data.path);
      setStatus(`Saved to Obsidian: ${data.path.split('/').pop()}`);
    } catch (err) {
      // Non-fatal: the debate still happened; Obsidian save is a bonus
      setStatus(`Note: could not save to Obsidian — ${err.message}`);
    }

    setIsActive(false);
    setPhase('done');

    // Register this debate in the sidebar history
    const newDebate = { id: Date.now(), topic: submittedTopic, date: new Date() };
    setDebates(prev => [...prev, newDebate]);
    setCurrentDebateId(newDebate.id);
  }

  // --- Render ---

  return (
    <div className="app">
      <Header
        onNewDebate={handleNewDebate}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        onOpenSettings={() => {/* settings panel — future feature */}}
      />

      <div className="main-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(open => !open)}
          debates={debates}
          currentDebateId={currentDebateId}
          onSelectDebate={setCurrentDebateId}
        />

        <main className="main-content">
          {phase === 'input' ? (
            /* Landing screen — TopicInput centred in the available space */
            <TopicInput onSubmit={handleTopicSubmit} isLoading={false} />
          ) : (
            /* Debate in progress or complete */
            <div className="debate-content">
              {/* Sticky status strip */}
              <StatusBar status={status} isActive={isActive} />

              {/* Topic heading */}
              <header style={styles.topicHeader}>
                <div style={styles.topicLabel}>The Panel is debating</div>
                <h2 style={styles.topicText}>{topic}</h2>
              </header>

              {/* Panellists grid */}
              {personas.length > 0 && (
                <section>
                  <h3 style={styles.sectionHeading}>The Panellists</h3>
                  <div style={styles.personaGrid}>
                    {personas.map((p, i) => (
                      <PersonaCard key={p.name} persona={p} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* Debate transcript */}
              {history.length > 0 && (
                <section>
                  <DebateThread
                    history={history}
                    personas={personas}
                    typingIndex={typingIndex}
                  />
                </section>
              )}

              {/* Summary and verdict */}
              {summary && (
                <section>
                  <SummaryPanel summary={summary} verdict={verdict} />
                </section>
              )}

              {/* Completion note */}
              {phase === 'done' && savedPath && (
                <div style={styles.completionNote}>
                  Debate archived &middot; {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

/** Simple promise-based delay helper */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const styles = {
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
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
    color: 'var(--text-primary)',
    fontStyle: 'italic',
    lineHeight: '1.3',
  },
  sectionHeading: {
    fontFamily: "'Playfair Display', serif",
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
  completionNote: {
    textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    paddingTop: 'var(--spacing-md)',
    borderTop: '1px solid var(--border)',
    animation: 'fadeIn 0.6s var(--ease-out)',
  },
};

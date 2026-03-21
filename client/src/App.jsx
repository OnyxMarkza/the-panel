import React, { useState, useEffect } from 'react';
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
  const [currentRound, setCurrentRound] = useState(0);

  // --- Layout state ---
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Debate history (current session only, shown in sidebar) ---
  const [debates, setDebates]               = useState([]);
  const [currentDebateId, setCurrentDebateId] = useState(null);

  // Load debates from localStorage on mount
  useEffect(() => {
    const savedDebates = localStorage.getItem('the-panel-debates');
    if (savedDebates) {
      try {
        const parsed = JSON.parse(savedDebates);
        setDebates(parsed);
      } catch (err) {
        console.warn('Failed to parse saved debates from localStorage:', err);
      }
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event) {
      // Ctrl/Cmd + N for new debate
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handleNewDebate();
      }
      // Ctrl/Cmd + S for save (when debate is done)
      if ((event.ctrlKey || event.metaKey) && event.key === 's' && phase === 'done') {
        event.preventDefault();
        // Trigger save if not already saved
        if (!savedPath) {
          // This would need to be implemented - for now just show a message
          setStatus('Save functionality would be triggered here (Ctrl+S)');
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase, savedPath]);

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
    setCurrentRound(0);
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
      const errorMessage = err.message.toLowerCase();
      let userFriendlyMessage = 'Unable to generate debate panel. Please try again.';

      if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Request timed out. The AI service is busy. Please try again in a moment.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        userFriendlyMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (errorMessage.includes('topic') && errorMessage.includes('length')) {
        userFriendlyMessage = 'Topic is too long. Please use 100 characters or less.';
      }

      setStatus(`Panel assembly failed: ${userFriendlyMessage}`);
      setIsActive(false);
      return;
    }

    // Brief pause so the user can read the personas before the debate begins
    await delay(1200);

    // -- Step 2: Run 3 debate rounds --
    setPhase('debate');
    let currentHistory = [];

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      setCurrentRound(round);
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
        const errorMessage = err.message.toLowerCase();
        let userFriendlyMessage = 'Debate round failed. The discussion may be incomplete.';

        if (errorMessage.includes('timeout')) {
          userFriendlyMessage = 'Round timed out. The AI service is busy. Continuing with available responses.';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          userFriendlyMessage = 'Rate limit reached. Waiting before continuing...';
          await delay(5000); // Wait 5 seconds before failing
        }

        setStatus(`Round ${round} issue: ${userFriendlyMessage}`);
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
      const errorMessage = err.message.toLowerCase();
      let userFriendlyMessage = 'Unable to generate debate summary. The discussion is still available.';

      if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Summary generation timed out. The debate transcript is still available.';
      }

      setStatus(`Summary failed: ${userFriendlyMessage}`);
      setIsActive(false);
      return;
    }

    // -- Step 4: Save to Obsidian --
    setStatus('Writing debate to Obsidian vault...');

    try {
      const res = await fetch('/api/save-to-obsidian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_SAVE_API_KEY || 'default-key-for-dev'
        },
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
      const errorMessage = err.message.toLowerCase();
      let userFriendlyMessage = 'Could not save to Obsidian. The debate is still available in your browser.';

      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'Authentication failed. Please check your save settings.';
      } else if (errorMessage.includes('vault') || errorMessage.includes('obsidian')) {
        userFriendlyMessage = 'Obsidian vault not found. Please ensure Obsidian is running and configured.';
      }

      // Non-fatal: the debate still happened; Obsidian save is a bonus
      setStatus(`Save issue: ${userFriendlyMessage}`);
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
                    currentRound={currentRound}
                    totalRounds={TOTAL_ROUNDS}
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
    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
    fontSize: 'clamp(1.6rem, 3.8vw, 2.5rem)',
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

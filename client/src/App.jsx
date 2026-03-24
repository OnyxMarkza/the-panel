import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Footer from './components/Footer.jsx';
import TopicInput from './components/TopicInput.jsx';
import PersonaCard from './components/PersonaCard.jsx';
import DebateThread from './components/DebateThread.jsx';
import SummaryPanel from './components/SummaryPanel.jsx';
import PanelBriefing from './components/PanelBriefing.jsx';
import StatusBar from './components/StatusBar.jsx';
import SharedDebateView from './components/SharedDebateView.jsx';

const TOTAL_ROUNDS = 3;

function DebateHome() {
  // --- Core debate state ---
  const [topic, setTopic] = useState('');
  const [personas, setPersonas] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState('');
  const [verdict, setVerdict] = useState('');

  // --- UI state ---
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('input'); // 'input' | 'personas' | 'debate' | 'summary' | 'done'
  const [typingIndex, setTypingIndex] = useState(-1);
  const [savedPath, setSavedPath] = useState('');
  const [debateId, setDebateId] = useState('');
  const [currentRound, setCurrentRound] = useState(0);

  // --- Layout state ---
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Debate history (current session only, shown in sidebar) ---
  const [debates, setDebates] = useState([]);
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
        if (!savedPath && !debateId) {
          setStatus('Save functionality would be triggered here (Ctrl+S)');
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase, savedPath, debateId]);

  function handleNewDebate() {
    setTopic('');
    setPersonas([]);
    setHistory([]);
    setSummary('');
    setVerdict('');
    setStatus('');
    setSavedPath('');
    setDebateId('');
    setTypingIndex(-1);
    setCurrentRound(0);
    setPhase('input');
  }

  async function handleTopicSubmit(submittedTopic) {
    setTopic(submittedTopic);
    setPhase('personas');

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

    await delay(1200);

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
          await delay(5000);
        }

        setStatus(`Round ${round} issue: ${userFriendlyMessage}`);
        setIsActive(false);
        return;
      }
    }

    setTypingIndex(-1);

    setStatus('Moderator is synthesising the debate...');
    setPhase('summary');

    let debateSummary;
    let debateVerdict;
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

    setStatus('Saving debate to database...');

    try {
      const res = await fetch('/api/save-to-database', {
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
      setSavedPath(data.path ?? '');
      setDebateId(data.debateId ?? '');
      setStatus(data.debateId
        ? 'Debate saved. You can now share it via link.'
        : 'Debate saved successfully.');
    } catch (err) {
      const errorMessage = err.message.toLowerCase();
      let userFriendlyMessage = 'Could not save debate. The debate is still available in your browser.';

      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'Authentication failed. Please check your save settings.';
      }

      setStatus(`Save issue: ${userFriendlyMessage}`);
    }

    setIsActive(false);
    setPhase('done');

    const newDebate = { id: Date.now(), topic: submittedTopic, date: new Date() };
    setDebates(prev => [...prev, newDebate]);
    setCurrentDebateId(newDebate.id);
  }

  return (
    <div className="app">
      <Header
        onNewDebate={handleNewDebate}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        onOpenSettings={() => {}}
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
            <TopicInput onSubmit={handleTopicSubmit} isLoading={false} />
          ) : (
            <div className="debate-content">
              <StatusBar status={status} isActive={isActive} />

              <header style={styles.topicHeader}>
                <div style={styles.topicLabel}>The Panel is debating</div>
                <h2 style={styles.topicText}>{topic}</h2>
              </header>

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

              {personas.length > 0 && (
                <section>
                  <PanelBriefing personas={personas} />
                </section>
              )}

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

              {summary && (
                <section>
                  <SummaryPanel summary={summary} verdict={verdict} debateId={debateId} />
                </section>
              )}

              {phase === 'done' && (savedPath || debateId) && (
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DebateHome />} />
      <Route path="/debate/:id" element={<SharedDebateView />} />
    </Routes>
  );
}

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

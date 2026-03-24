import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const DEFAULT_PERSONA_COUNT = 5;

export default function App() {
  const [topic, setTopic] = useState('');
function DebateHome() {
  // --- Core debate state ---
  const [topic, setTopic] = useState('');
  const [topic, setTopic]     = useState('');
  const [personaCount, setPersonaCount] = useState(5);
  const [personas, setPersonas] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState('');
  const [verdict, setVerdict] = useState('');
  const [personaCount, setPersonaCount] = useState(DEFAULT_PERSONA_COUNT);

  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('input');
  const [typingIndex, setTypingIndex] = useState(-1);
  const [savedPath, setSavedPath] = useState('');

  // --- UI state ---
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('input'); // 'input' | 'personas' | 'debate' | 'summary' | 'done'
  const [typingIndex, setTypingIndex] = useState(-1);
  const [savedPath, setSavedPath] = useState('');
  const [debateId, setDebateId] = useState('');
  const [currentRound, setCurrentRound] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Debate history (current session only, shown in sidebar) ---
  const [debates, setDebates] = useState([]);
  const [currentDebateId, setCurrentDebateId] = useState(null);
  const [shareUrl, setShareUrl] = useState('');

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  const isLoading = isActive || inFlightRef.current;

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

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Route-level flow sanity: support "/" and "/debate/:id" directly.
  useEffect(() => {
    const path = window.location.pathname;
    const debatePathMatch = path.match(/^\/debate\/(.+)$/);
    if (debatePathMatch) {
      setCurrentDebateId(debatePathMatch[1]);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handleNewDebate();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's' && phase === 'done') {
        event.preventDefault();
        if (!savedPath) {
        if (!savedPath && !debateId) {
          setStatus('Save functionality would be triggered here (Ctrl+S)');
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase, savedPath, debateId]);

  const safeSet = useCallback((setter, value, requestId) => {
    if (!mountedRef.current) return;
    if (requestId !== requestIdRef.current) return;
    setter(value);
  }, []);

  function handleNewDebate() {
    requestIdRef.current += 1; // invalidate stale async work
    inFlightRef.current = false;
    setTopic('');
    setPersonaCount(5);
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
    setIsActive(false);
    setPersonaCount(DEFAULT_PERSONA_COUNT);
  }

  async function requestJson(url, payload, fallbackMessage) {
    let response;
    setCurrentDebateId(null);
    setShareUrl('');
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }

  /**
   * Main orchestration function — called when the user submits a topic.
   * Each step is sequential: we await each API call before moving on.
   */
  async function handleTopicSubmit(submittedTopic, submittedPersonaCount = 5) {
    setPersonaCount(submittedPersonaCount);
  async function handleTopicSubmit(submittedTopic) {
    let savedDebateId = null;
    setTopic(submittedTopic);
    setPhase('personas');

    setStatus('Assembling the panel...');
    setIsActive(true);

    let generatedPersonas;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        body: JSON.stringify({ topic: submittedTopic, count: submittedPersonaCount }),
      });
    } catch {
      throw new Error(fallbackMessage);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(fallbackMessage);
    }

    if (!response.ok || data.error) {
      throw new Error(data?.message || fallbackMessage);
    }

    if (!data || typeof data !== 'object') {
      throw new Error(fallbackMessage);
    }

    return data;
  }

  async function handleTopicSubmit(submittedTopic, submittedCount = DEFAULT_PERSONA_COUNT) {
    if (inFlightRef.current) return;

    const normalizedTopic = typeof submittedTopic === 'string' ? submittedTopic.trim() : '';
    const normalizedCount = Number.isInteger(submittedCount)
      ? Math.min(Math.max(submittedCount, 3), 7)
      : DEFAULT_PERSONA_COUNT;

    if (!normalizedTopic) {
      setStatus('Please enter a topic.');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;

    safeSet(setTopic, normalizedTopic, requestId);
    safeSet(setPersonaCount, normalizedCount, requestId);
    safeSet(setPhase, 'personas', requestId);
    safeSet(setStatus, 'Assembling the panel...', requestId);
    safeSet(setIsActive, true, requestId);

    let generatedPersonas;
    try {
      const data = await requestJson(
        '/api/generate-personas',
        { topic: normalizedTopic, count: normalizedCount },
        'Unable to generate debate panel. Please try again.',
      );

      generatedPersonas = Array.isArray(data.personas) ? data.personas : [];
      if (generatedPersonas.length === 0) {
        throw new Error('Unable to generate debate panel. Please try again.');
      }

      safeSet(setPersonas, generatedPersonas, requestId);
    } catch (err) {
      safeSet(setStatus, `Panel assembly failed: ${err.message}`, requestId);
      safeSet(setIsActive, false, requestId);
      inFlightRef.current = false;
      return;
    }

    await delay(1200);
    if (requestId !== requestIdRef.current || !mountedRef.current) return;

    safeSet(setPhase, 'debate', requestId);
    setPhase('debate');
    let currentHistory = [];

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      safeSet(setCurrentRound, round, requestId);
      safeSet(setStatus, `Round ${round} of ${TOTAL_ROUNDS} — the panel is deliberating...`, requestId);

      try {
        const data = await requestJson(
          '/api/debate-round',
          {
            personas: generatedPersonas,
            history: currentHistory,
            topic: normalizedTopic,
            roundNumber: round,
          },
          'Debate round failed. The discussion may be incomplete.',
        );

        const roundHistory = Array.isArray(data.history) ? data.history : [];
        for (let i = currentHistory.length; i < roundHistory.length; i++) {
          if (requestId !== requestIdRef.current || !mountedRef.current) return;
          safeSet(setTypingIndex, i, requestId);
          safeSet(setHistory, roundHistory.slice(0, i + 1), requestId);

          const msg = roundHistory[i]?.content;
          await delay(typeof msg === 'string' ? msg.length * 12 + 400 : 700);
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        for (let i = currentHistory.length; i < data.history.length; i++) {
          setTypingIndex(i);
          setHistory([...data.history.slice(0, i + 1)]);
          await delay(data.history[i].content.length * 12 + 400);
        }

        currentHistory = roundHistory;
      } catch (err) {
        safeSet(setStatus, `Round ${round} issue: ${err.message}`, requestId);
        safeSet(setIsActive, false, requestId);
        inFlightRef.current = false;
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

    safeSet(setTypingIndex, -1, requestId);
    safeSet(setStatus, 'Moderator is synthesising the debate...', requestId);
    safeSet(setPhase, 'summary', requestId);
    setTypingIndex(-1);

    setStatus('Moderator is synthesising the debate...');
    setPhase('summary');

    let debateSummary;
    let debateVerdict;
    try {
      const data = await requestJson(
        '/api/summarise',
        { topic: normalizedTopic, history: currentHistory },
        'Unable to generate debate summary. The discussion is still available.',
      );
      debateSummary = typeof data.summary === 'string' ? data.summary : '';
      debateVerdict = typeof data.verdict === 'string' ? data.verdict : 'No clear verdict reached.';

      safeSet(setSummary, debateSummary, requestId);
      safeSet(setVerdict, debateVerdict, requestId);
    } catch (err) {
      safeSet(setStatus, `Summary failed: ${err.message}`, requestId);
      safeSet(setIsActive, false, requestId);
      inFlightRef.current = false;
      return;
    }

    safeSet(setStatus, 'Writing debate to Obsidian vault...', requestId);
    setStatus('Saving debate to database...');
    // -- Step 4: Save to configured storage backend --
    setStatus('Saving debate transcript...');

    try {
      const res = await fetch('/api/save-to-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_SAVE_API_KEY || 'default-key-for-dev',
        },
        body: JSON.stringify({
          topic: normalizedTopic,
          personas: generatedPersonas,
          history: currentHistory,
          summary: debateSummary,
          verdict: debateVerdict,
          persona_count: normalizedCount,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data?.message || 'Could not save to Obsidian.');
      const safePath = typeof data.path === 'string' ? data.path : '';

      safeSet(setSavedPath, safePath, requestId);
      safeSet(setStatus, safePath ? `Saved to Obsidian: ${safePath.split('/').pop()}` : 'Saved to Obsidian.', requestId);
    } catch (err) {
      safeSet(setStatus, `Save issue: ${err.message}`, requestId);
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
      const returnedDebateId = data.id || null;
      const returnedPath = data.path || '';
      savedDebateId = returnedDebateId;

      setSavedPath(returnedPath);
      setCurrentDebateId(returnedDebateId);

      if (returnedDebateId) {
        const generatedShareUrl = `${window.location.origin}/debate/${returnedDebateId}`;
        setShareUrl(generatedShareUrl);
        window.history.replaceState({}, '', `/debate/${returnedDebateId}`);
        setStatus('Debate saved and share link generated.');
      } else if (returnedPath) {
        setStatus(`Saved locally: ${returnedPath.split('/').pop()}`);
      } else if (data.success) {
        setStatus('Debate save completed.');
      } else {
        setStatus('Debate save failed; transcript remains available locally.');
      }
    } catch (err) {
      const errorMessage = err.message.toLowerCase();
      let userFriendlyMessage = 'Could not save debate. The transcript is still available in your browser.';

      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'Authentication failed. Please check your save settings.';
      } else if (errorMessage.includes('vault') || errorMessage.includes('obsidian')) {
        userFriendlyMessage = 'Local vault save failed. Please check your local save settings.';
      }

      setStatus(`Save issue: ${userFriendlyMessage}`);
    }

    safeSet(setIsActive, false, requestId);
    safeSet(setPhase, 'done', requestId);
    inFlightRef.current = false;

    const newDebate = { id: Date.now(), topic: normalizedTopic, date: new Date(), persona_count: normalizedCount };
    setDebates((prev) => [...prev, newDebate]);
    setCurrentDebateId(newDebate.id);
  }

  const sidebarDebates = useMemo(
    () => debates.map((debate) => ({ ...debate, persona_count: debate.persona_count ?? DEFAULT_PERSONA_COUNT })),
    [debates],
  );
    const newDebate = { id: Date.now(), topic: submittedTopic, date: new Date() };
    // Register this debate in the sidebar history
    const newDebate = { id: savedDebateId || Date.now(), topic: submittedTopic, date: new Date() };
    setDebates(prev => [...prev, newDebate]);
    setCurrentDebateId(newDebate.id);
  }

  function handleShareLink() {
    if (!currentDebateId || !shareUrl) {
      setStatus('Share link unavailable until a database debate ID is assigned.');
      return;
    }

    navigator.clipboard.writeText(shareUrl)
      .then(() => setStatus('Share link copied to clipboard.'))
      .catch(() => setStatus(`Share link: ${shareUrl}`));
  }

  // --- Render ---

  return (
    <div className="app">
      <Header
        onNewDebate={handleNewDebate}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        onOpenSettings={() => {}}
      />

      <div className="main-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((open) => !open)}
          debates={sidebarDebates}
          currentDebateId={currentDebateId}
          onSelectDebate={setCurrentDebateId}
        />

        <main className="main-content">
          {phase === 'input' ? (
            <TopicInput onSubmit={handleTopicSubmit} isLoading={isLoading} defaultPersonaCount={personaCount} />
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
                  <h3 style={styles.sectionHeading}>
                    The Panellists ({personas.length || personaCount})
                  </h3>
                  <div style={styles.personaGrid}>
                    {personas.map((p, i) => (
                      <PersonaCard key={p.name ?? `persona-${i}`} persona={p} index={i} />
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

              {phase === 'done' && savedPath && (
              {phase === 'done' && (savedPath || debateId) && (
                <div style={styles.completionNote}>
                  Debate archived &middot; {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              )}

              {phase === 'done' && (
                <div style={styles.shareActions}>
                  <button
                    type="button"
                    onClick={handleShareLink}
                    style={styles.shareButton}
                  >
                    Copy Share Link
                  </button>
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  shareActions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'var(--spacing-sm)',
  },
  shareButton: {
    background: 'transparent',
    border: '1px solid var(--gold)',
    color: 'var(--gold)',
    padding: '0.45rem 0.85rem',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
};

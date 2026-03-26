import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function DebateHome() {
  const [topic, setTopic] = useState('');
  const [personaCount, setPersonaCount] = useState(DEFAULT_PERSONA_COUNT);
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
  const [currentRound, setCurrentRound] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debates, setDebates] = useState([]);
  const [currentDebateId, setCurrentDebateId] = useState(null);
  const [shareUrl, setShareUrl] = useState('');

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const savedDebates = localStorage.getItem('the-panel-debates');
    if (!savedDebates) return;
    try {
      setDebates(JSON.parse(savedDebates));
    } catch (err) {
      console.warn('Failed to parse saved debates from localStorage:', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('the-panel-debates', JSON.stringify(debates));
  }, [debates]);

  useEffect(() => () => {
    mountedRef.current = false;
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
          setStatus('Save functionality would be triggered here (Ctrl+S)');
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase, savedPath]);

  const safeSet = useCallback((setter, value, requestId) => {
    if (!mountedRef.current || requestId !== requestIdRef.current) return;
    setter(value);
  }, []);

  function handleNewDebate() {
    requestIdRef.current += 1;
    inFlightRef.current = false;
    setTopic('');
    setPersonaCount(DEFAULT_PERSONA_COUNT);
    setPersonas([]);
    setHistory([]);
    setSummary('');
    setVerdict('');
    setStatus('');
    setSavedPath('');
    setTypingIndex(-1);
    setCurrentRound(0);
    setPhase('input');
    setIsActive(false);
    setCurrentDebateId(null);
    setShareUrl('');
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }

  function handleShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  }

  async function requestJson(url, payload, fallbackMessage, timeoutMs = 45000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw new Error(fallbackMessage);
    } finally {
      clearTimeout(timeoutId);
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

  async function loadDebateById(debateId) {
    if (!debateId) return;

    setStatus('Loading shared debate...');
    setIsActive(true);

    try {
      const res = await fetch(`/api/debates/${debateId}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message || 'Unable to load debate.');

      const personaLookup = new Map((data.personas || []).map((p) => [p.id, p.name]));
      const hydratedHistory = (data.messages || []).map((msg) => ({
        persona: personaLookup.get(msg.persona_id) || 'Unknown Speaker',
        content: msg.content,
      }));

      setTopic(data.topic || '');
      setPersonas(data.personas || []);
      setHistory(hydratedHistory);
      setSummary(data.summary || '');
      setVerdict(data.verdict || '');
      setCurrentDebateId(data.id || debateId);
      setShareUrl(`${window.location.origin}/debate/${data.id || debateId}`);
      setPhase('done');
      setStatus('Shared debate loaded.');
    } catch (err) {
      setStatus(`Could not load shared debate: ${err.message}`);
      setPhase('input');
    } finally {
      setIsActive(false);
    }
  }

  async function handleSelectDebate(debateId) {
    setCurrentDebateId(debateId);
    if (!debateId) return;

    if (typeof debateId === 'string') {
      window.history.replaceState({}, '', `/debate/${debateId}`);
      await loadDebateById(debateId);
      return;
    }

    // Local-only entries (numeric IDs) do not have a shareable backend record.
    setShareUrl('');
  }

  /**
   * Main orchestration function — called when the user submits a topic.
   * Each step is sequential: we await each API call before moving on.
   */
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
      const panelData = await requestJson(
        '/api/generate-personas',
        { topic: normalizedTopic, count: normalizedCount },
        'Unable to generate debate panel. Please try again.',
      );

      generatedPersonas = Array.isArray(panelData.personas) ? panelData.personas : [];
      if (generatedPersonas.length === 0) {
        throw new Error('Unable to generate debate panel. Please try again.');
      }

      safeSet(setPersonas, generatedPersonas, requestId);
      safeSet(setPhase, 'debate', requestId);
    } catch (err) {
      safeSet(setStatus, `Panel assembly failed: ${err.message}`, requestId);
      safeSet(setIsActive, false, requestId);
      inFlightRef.current = false;
      return;
    }

    await delay(1200);
    if (requestId !== requestIdRef.current || !mountedRef.current) return;

    safeSet(setPhase, 'debate', requestId);
    let currentHistory = [];
    for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
      safeSet(setCurrentRound, round, requestId);
      safeSet(setStatus, `Round ${round} of ${TOTAL_ROUNDS} — the panel is deliberating...`, requestId);

      try {
        const roundData = await requestJson(
          '/api/debate-round',
          { personas: generatedPersonas, history: currentHistory, topic: normalizedTopic, roundNumber: round },
          'Debate round failed. The discussion may be incomplete.',
        );

        const roundHistory = Array.isArray(roundData.history) ? roundData.history : [];
        for (let i = currentHistory.length; i < roundHistory.length; i += 1) {
          safeSet(setTypingIndex, i, requestId);
          safeSet(setHistory, roundHistory.slice(0, i + 1), requestId);

          const msg = roundHistory[i]?.content;
          await delay(typeof msg === 'string' ? msg.length * 12 + 400 : 700);
        }

        currentHistory = roundHistory;
      } catch (err) {
        const errorMessage = err.message.toLowerCase();
        let userFriendlyMessage = 'Debate round failed. The discussion may be incomplete.';

        if (errorMessage.includes('timeout')) {
          userFriendlyMessage = 'Round timed out. The AI service is busy. Continuing with available responses.';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          userFriendlyMessage = 'Rate limit reached. Waiting before continuing...';
          await delay(5000);
        }

        safeSet(setStatus, `Round ${round} issue: ${userFriendlyMessage}`, requestId);
        safeSet(setIsActive, false, requestId);
        inFlightRef.current = false;
        return;
      }
    }

    safeSet(setTypingIndex, -1, requestId);
    safeSet(setStatus, 'Moderator is synthesising the debate...', requestId);
    safeSet(setPhase, 'summary', requestId);

    let debateSummary = '';
    let debateVerdict = '';

    try {
      safeSet(setPhase, 'summary', requestId);
      safeSet(setStatus, 'Moderator is drafting the summary...', requestId);

      const summaryData = await requestJson(
        '/api/summarise',
        { topic: normalizedTopic, history: currentHistory },
        'Could not generate summary.',
      );

      debateSummary = typeof summaryData.summary === 'string' ? summaryData.summary : '';
      debateVerdict = typeof summaryData.verdict === 'string' ? summaryData.verdict : '';

      safeSet(setSummary, debateSummary, requestId);
      safeSet(setVerdict, debateVerdict, requestId);
    } catch (err) {
      safeSet(setStatus, `Summary failed: ${err.message}`, requestId);
      safeSet(setIsActive, false, requestId);
      inFlightRef.current = false;
      return;
    }

    safeSet(setStatus, 'Saving debate transcript...', requestId);

    try {
      safeSet(setStatus, 'Saving debate transcript...', requestId);

      const saveData = await requestJson(
        '/api/save-to-database',
        {
          topic: normalizedTopic,
          personas: generatedPersonas,
          history: currentHistory,
          summary: debateSummary,
          verdict: debateVerdict,
          persona_count: normalizedCount,
        },
        'Could not save debate.',
      );

      const returnedDebateId = saveData.id || null;
      const returnedPath = saveData.path || '';

      safeSet(setSavedPath, returnedPath, requestId);
      safeSet(setCurrentDebateId, returnedDebateId, requestId);

      if (returnedDebateId) {
        const generatedShareUrl = `${window.location.origin}/debate/${returnedDebateId}`;
        safeSet(setShareUrl, generatedShareUrl, requestId);
        window.history.replaceState({}, '', `/debate/${returnedDebateId}`);
        safeSet(setStatus, 'Debate saved and share link generated.', requestId);
      } else if (returnedPath) {
        safeSet(setStatus, `Saved locally: ${returnedPath.split('/').pop()}`, requestId);
      } else if (saveData.success) {
        safeSet(setStatus, 'Debate save completed.', requestId);
      } else {
        safeSet(setStatus, 'Debate save failed; transcript remains available locally.', requestId);
      }
    } catch (err) {
      const errorMessage = err.message.toLowerCase();
      let userFriendlyMessage = 'Could not save debate. The transcript is still available in your browser.';

      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'Authentication failed. Please check your save settings.';
      } else if (errorMessage.includes('vault') || errorMessage.includes('obsidian')) {
        userFriendlyMessage = 'Local vault save failed. Please check your local save settings.';
      }

      safeSet(setStatus, `Save issue: ${userFriendlyMessage}`, requestId);
    }

    safeSet(setTypingIndex, -1, requestId);
    safeSet(setCurrentRound, TOTAL_ROUNDS, requestId);
    safeSet(setPhase, 'done', requestId);
    safeSet(setIsActive, false, requestId);
    safeSet(setStatus, 'Debate complete.', requestId);
    inFlightRef.current = false;

    const newDebate = { id: Date.now(), topic: normalizedTopic, date: new Date(), persona_count: normalizedCount };
    setDebates((prev) => [...prev, newDebate]);
    setCurrentDebateId(newDebate.id);
  }

  const sidebarDebates = useMemo(
    () => debates.map((debate) => ({ ...debate, persona_count: debate.persona_count ?? DEFAULT_PERSONA_COUNT })),
    [debates],
  );

  return (
    <div className="app">
      <Header
        onNewDebate={handleNewDebate}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenSettings={() => {}}
      />

      <StatusBar status={status} isActive={isActive} />

      <div className="main-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          debates={debates}
          currentDebateId={currentDebateId}
          onSelectDebate={setCurrentDebateId}
        />

        <main className="main-content">
          {phase === 'input' ? (
            <TopicInput onSubmit={handleTopicSubmit} isLoading={isActive} defaultPersonaCount={personaCount} />
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
                  <SummaryPanel summary={summary} verdict={verdict} debateId={currentDebateId} />
                </section>
              )}

              {phase === 'done' && (savedPath || currentDebateId) && (
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
                    style={{
                      ...styles.shareButton,
                      opacity: shareUrl ? 1 : 0.5,
                      cursor: shareUrl ? 'pointer' : 'not-allowed',
                    }}
                    disabled={!shareUrl}
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

const styles = {
  topicHeader: {
    marginBottom: 'var(--spacing-lg)',
  },
  topicLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 'var(--spacing-xs)',
  },
  topicText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1.4rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
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
    marginTop: 'var(--spacing-md)',
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
  },
  shareActions: {
    marginTop: 'var(--spacing-md)',
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  shareButton: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    padding: '0.5rem 1rem',
    background: 'var(--gold)',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontWeight: '500',
  },
};

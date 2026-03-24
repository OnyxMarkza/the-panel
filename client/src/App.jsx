import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('input');
  const [typingIndex, setTypingIndex] = useState(-1);
  const [savedPath, setSavedPath] = useState('');
  const [debateId, setDebateId] = useState('');
  const [currentRound, setCurrentRound] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debates, setDebates] = useState([]);
  const [currentDebateId, setCurrentDebateId] = useState(null);

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
    setDebateId('');
    setTypingIndex(-1);
    setCurrentRound(0);
    setPhase('input');
    setIsActive(false);
    setCurrentDebateId(null);
  }

  async function requestJson(url, payload, fallbackMessage) {
    let response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          const messageLength = typeof roundHistory[i]?.content === 'string' ? roundHistory[i].content.length : 0;
          await new Promise((resolve) => setTimeout(resolve, Math.min(1800, messageLength * 12 + 300)));
        }

        currentHistory = roundHistory;
      } catch (err) {
        safeSet(setStatus, `Round ${round} issue: ${err.message}`, requestId);
        safeSet(setIsActive, false, requestId);
        inFlightRef.current = false;
        return;
      }
    }

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
        'Could not save debate. The transcript is still available in your browser.',
      );

      safeSet(setSavedPath, typeof saveData.path === 'string' ? saveData.path : '', requestId);
      safeSet(setDebateId, typeof saveData.id === 'string' ? saveData.id : '', requestId);
      safeSet(setCurrentDebateId, saveData.id || null, requestId);
    } catch (err) {
      safeSet(setStatus, `Save issue: ${err.message}`, requestId);
    }

    safeSet(setTypingIndex, -1, requestId);
    safeSet(setCurrentRound, TOTAL_ROUNDS, requestId);
    safeSet(setPhase, 'done', requestId);
    safeSet(setIsActive, false, requestId);
    safeSet(setStatus, 'Debate complete.', requestId);
    inFlightRef.current = false;

    setDebates((prev) => [
      { id: debateId || Date.now(), topic: normalizedTopic, date: new Date().toISOString() },
      ...prev,
    ].slice(0, 100));
  }

  return (
    <div className="app">
      <Header
        onNewDebate={handleNewDebate}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenSettings={() => setStatus('Settings coming soon.')}
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
          <div className="debate-content">
            {phase === 'input' && (
              <TopicInput
                onSubmit={handleTopicSubmit}
                isLoading={isActive}
                defaultPersonaCount={personaCount}
              />
            )}

            {personas.length > 0 && phase !== 'input' && (
              <section>
                <h3 style={sectionHeading}>The Panellists</h3>
                <div style={personaGrid}>
                  {personas.map((persona, index) => (
                    <PersonaCard key={`${persona.name}-${index}`} persona={persona} index={index} />
                  ))}
                </div>
              </section>
            )}

            {personas.length > 0 && phase !== 'input' && (
              <section>
                <PanelBriefing personas={personas} />
              </section>
            )}

            {(phase === 'debate' || phase === 'summary' || phase === 'done') && (
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

            {(phase === 'summary' || phase === 'done') && (
              <section>
                <SummaryPanel
                  summary={summary}
                  verdict={verdict}
                  debateId={debateId}
                />
                {savedPath && <p style={savedPathText}>Saved: {savedPath}</p>}
              </section>
            )}
          </div>
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

const sectionHeading = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.85rem',
  color: 'var(--gold)',
  marginBottom: 'var(--spacing-md)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: '400',
};

const personaGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 'var(--spacing-sm)',
};

const savedPathText = {
  marginTop: 'var(--spacing-sm)',
  fontFamily: "'JetBrains Mono', monospace",
  color: 'var(--text-muted)',
  fontSize: '0.72rem',
};

import { useEffect, useState } from 'react';
import useSimulationStore from './store/useSimulationStore';
import IntroModal from './components/IntroModal';
import ProgressBar from './components/ProgressBar';
import CurrentStatePanel from './components/CurrentStatePanel';
import GraphsPanel from './components/GraphsPanel';
import ChoicesPanel from './components/ChoicesPanel';
import ConfigPanel from './components/ConfigPanel';
import EmotionalFeedback from './components/EmotionalFeedback';
import './App.css';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const initialize = useSimulationStore((state) => state.initialize);
  const simState = useSimulationStore((state) => state.simState);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!simState) {
    return <div className="loading">Loading simulator...</div>;
  }

  return (
    <div className="app">
      {/* Emotional Feedback System */}
      <EmotionalFeedback />

      {/* Intro Modal */}
      {showIntro && <IntroModal onClose={() => setShowIntro(false)} />}

      {/* Configuration Modal */}
      {showConfig && <ConfigPanel onClose={() => setShowConfig(false)} />}

      {/* Top Bar with Progress */}
      <header className="app-header">
        <div className="header-left">
          <h1>AI-2027 Simulator</h1>
        </div>
        <div className="header-center">
          <ProgressBar />
        </div>
        <div className="header-right">
          <button onClick={() => setShowIntro(true)} className="icon-button" title="Help">
            ?
          </button>
          <button onClick={() => setShowConfig(true)} className="icon-button" title="Settings">
            ⚙
          </button>
        </div>
      </header>

      {/* Main Content - Single Pane */}
      <div className="main-content">
        {/* Top Row: State + Graphs */}
        <div className="top-row">
          <div className="state-section">
            <CurrentStatePanel />
          </div>
          <div className="graphs-section">
            <GraphsPanel />
          </div>
        </div>

        {/* Bottom Row: Choices */}
        <div className="bottom-row">
          <ChoicesPanel />
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <span className="credit">
          Based on{' '}
          <a href="https://ai-2027.com" target="_blank" rel="noopener noreferrer">
            ai-2027.com
          </a>
          {' '}research by Kokotajlo, Alexander, et al.
        </span>
      </footer>
    </div>
  );
}

export default App;

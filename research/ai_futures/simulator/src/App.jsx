import { useEffect, useState } from 'react';
import useSimulationStore from './store/useSimulationStore';
import ConfigPanel from './components/ConfigPanel';
import ControlPanel from './components/ControlPanel';
import StateMachineView from './components/StateMachineView';
import FlowchartView from './components/FlowchartView';
import VariablesView from './components/VariablesView';
import GraphsView from './components/GraphsView';
import StateInfoPanel from './components/StateInfoPanel';
import ChoicePanel from './components/ChoicePanel';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('statemachine');
  const [showConfig, setShowConfig] = useState(true);

  const initialize = useSimulationStore((state) => state.initialize);
  const simState = useSimulationStore((state) => state.simState);
  const isAtBranchPoint = simState?.isAtBranchPoint || false;

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!simState) {
    return <div className="loading">Loading simulator...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI-2027 Interactive Simulator</h1>
        <p className="subtitle">Faithful representation of AI Futures Project research</p>
      </header>

      {/* Configuration Modal */}
      {showConfig && (
        <ConfigPanel onClose={() => setShowConfig(false)} />
      )}

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Panel - Controls and Info */}
        <div className="left-panel">
          <ControlPanel />
          <StateInfoPanel />
          {isAtBranchPoint && <ChoicePanel />}
          <VariablesView />
        </div>

        {/* Right Panel - Visualizations */}
        <div className="right-panel">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'statemachine' ? 'active' : ''}`}
              onClick={() => setActiveTab('statemachine')}
            >
              State Machine
            </button>
            <button
              className={`tab ${activeTab === 'flowchart' ? 'active' : ''}`}
              onClick={() => setActiveTab('flowchart')}
            >
              Flowchart
            </button>
            <button
              className={`tab ${activeTab === 'graphs' ? 'active' : ''}`}
              onClick={() => setActiveTab('graphs')}
            >
              Graphs
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'statemachine' && <StateMachineView />}
            {activeTab === 'flowchart' && <FlowchartView />}
            {activeTab === 'graphs' && <GraphsView />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <button onClick={() => setShowConfig(true)} className="config-button">
          ⚙️ Settings
        </button>
        <span className="credit">
          Based on{' '}
          <a href="https://ai-2027.com" target="_blank" rel="noopener noreferrer">
            ai-2027.com
          </a>{' '}
          by Daniel Kokotajlo, Scott Alexander, et al.
        </span>
      </footer>
    </div>
  );
}

export default App;

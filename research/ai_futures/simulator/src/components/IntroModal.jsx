function IntroModal({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome to the AI-2027 Simulator</h2>

        <p>
          This interactive simulation explores potential AI development scenarios from <strong>2025-2030</strong>,
          based on research by Daniel Kokotajlo, Scott Alexander, and the AI Futures Project.
        </p>

        <h3 style={{ color: '#4ecdc4', fontSize: '18px', marginTop: '20px', marginBottom: '10px' }}>
          How It Works
        </h3>
        <ul>
          <li><strong>Timeline:</strong> Watch AI capabilities evolve month by month</li>
          <li><strong>Key Variables:</strong> Track AI R&D acceleration, economic impacts, and risk indicators</li>
          <li><strong>Decision Points:</strong> At critical junctures, choose between different paths</li>
          <li><strong>Branching Futures:</strong> Your choices affect which scenarios unfold</li>
        </ul>

        <h3 style={{ color: '#4ecdc4', fontSize: '18px', marginTop: '20px', marginBottom: '10px' }}>
          What You'll See
        </h3>
        <ul>
          <li><strong>Current State:</strong> What's happening now in the simulation (left panel)</li>
          <li><strong>Graphs:</strong> Real-time visualization of key variables (right panel)</li>
          <li><strong>Options:</strong> Choices that determine the future path (bottom panel)</li>
          <li><strong>Progress:</strong> How far through the scenario you are (top bar)</li>
        </ul>

        <h3 style={{ color: '#4ecdc4', fontSize: '18px', marginTop: '20px', marginBottom: '10px' }}>
          Key Dates
        </h3>
        <ul>
          <li><strong>Mid-2025:</strong> First glimpse of AI agents</li>
          <li><strong>Early 2027:</strong> Superhuman coders arrive</li>
          <li><strong>Oct 2027:</strong> The branch point - a critical decision</li>
          <li><strong>2030:</strong> Two very different possible endings</li>
        </ul>

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#8e8e8e', fontStyle: 'italic' }}>
          Note: This simulation is faithful to the AI-2027 research. It presents scenarios as envisioned
          by the researchers, not predictions of what will necessarily happen.
        </p>

        <div className="modal-actions">
          <button onClick={onClose} className="primary">
            Start Simulation
          </button>
        </div>
      </div>
    </div>
  );
}

export default IntroModal;

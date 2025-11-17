import { useState } from 'react';
import useSimulationStore from '../store/useSimulationStore';

function IntroModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [simYears, setSimYears] = useState(3); // Default: 3 years (36 months)
  const [playMinutes, setPlayMinutes] = useState(5); // Default: 5 minutes

  const setSimulationSettings = useSimulationStore((state) => state.setSimulationSettings);

  const handleStart = () => {
    // Calculate settings
    const simMonths = simYears * 12;

    // Calculate speed: months per second
    // If user wants to sim 36 months in 5 minutes (300 seconds)
    // Speed = 36 / 300 = 0.12 months/second
    const speed = simMonths / (playMinutes * 60);

    setSimulationSettings({
      simDurationMonths: simMonths,
      targetDurationMinutes: playMinutes,
      speed,
    });

    onClose();
  };

  if (step === 1) {
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
            <li><strong>Progress Bar:</strong> Shows how far through the scenario (top)</li>
            <li><strong>Current State:</strong> What's happening now in the simulation (left panel)</li>
            <li><strong>Graphs:</strong> Real-time visualization of all key variables (right panel)</li>
            <li><strong>Choices:</strong> Decision points that determine the future path (bottom panel)</li>
          </ul>

          <p style={{ marginTop: '20px', fontSize: '14px', color: '#8e8e8e', fontStyle: 'italic' }}>
            Note: This simulation is faithful to the AI-2027 research. It presents scenarios as envisioned
            by the researchers, not predictions of what will necessarily happen.
          </p>

          <div className="modal-actions">
            <button onClick={() => setStep(2)} className="primary">
              Configure Simulation →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Simulation Settings</h2>

        <p style={{ marginBottom: '20px', color: '#e0e0e0' }}>
          Configure how long you want to simulate and how long you want to play.
        </p>

        {/* Simulation Duration */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#4ecdc4', fontSize: '16px', marginBottom: '12px' }}>
            How many years to simulate?
          </h3>
          <p style={{ fontSize: '13px', color: '#8e8e8e', marginBottom: '12px' }}>
            The AI-2027 scenario spans from 2025 to 2030 (5 years). You can simulate a shorter period.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(years => (
              <button
                key={years}
                onClick={() => setSimYears(years)}
                style={{
                  flex: '1 1 80px',
                  padding: '12px',
                  background: simYears === years ? '#4ecdc4' : undefined,
                  color: simYears === years ? '#0a0e1a' : undefined,
                  fontSize: '14px',
                }}
              >
                {years} {years === 1 ? 'year' : 'years'}
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  ({years * 12} months)
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Playback Duration */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#4ecdc4', fontSize: '16px', marginBottom: '12px' }}>
            How long do you want to play?
          </h3>
          <p style={{ fontSize: '13px', color: '#8e8e8e', marginBottom: '12px' }}>
            Real-world time to complete the simulation. Shorter = faster playback.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[2, 5, 10, 15, 20].map(minutes => (
              <button
                key={minutes}
                onClick={() => setPlayMinutes(minutes)}
                style={{
                  flex: '1 1 80px',
                  padding: '12px',
                  background: playMinutes === minutes ? '#4ecdc4' : undefined,
                  color: playMinutes === minutes ? '#0a0e1a' : undefined,
                  fontSize: '14px',
                }}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{
          background: '#0f1629',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #4ecdc4',
          marginBottom: '20px',
        }}>
          <h3 style={{ color: '#4ecdc4', fontSize: '14px', marginBottom: '10px' }}>
            Summary
          </h3>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>
              <strong>Simulation period:</strong> {simYears} {simYears === 1 ? 'year' : 'years'} ({simYears * 12} months)
            </div>
            <div>
              <strong>Real-world play time:</strong> ~{playMinutes} minutes
            </div>
            <div style={{ marginTop: '8px', color: '#8e8e8e', fontSize: '12px' }}>
              The simulation will advance at {((simYears * 12) / (playMinutes * 60)).toFixed(2)} months per second.
              You can pause, speed up, or slow down at any time.
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={() => setStep(1)}>
            ← Back
          </button>
          <button onClick={handleStart} className="primary">
            Start Simulation
          </button>
        </div>
      </div>
    </div>
  );
}

export default IntroModal;

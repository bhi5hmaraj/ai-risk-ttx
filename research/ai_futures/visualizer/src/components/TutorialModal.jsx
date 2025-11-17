import React from 'react'
import './TutorialModal.css'

export default function TutorialModal({ onClose }) {
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-close" onClick={onClose}>&times;</button>

        <h2>AI2027 Interactive Forecast</h2>

        <div className="tutorial-content">
          <section>
            <h3>What is this?</h3>
            <p>
              An interactive exploration of Daniel Kokotajlo & Scott Alexander's
              AI timeline forecast (2024-2027). Make decisions that shape the path
              to AGI and beyond.
            </p>
          </section>

          <section>
            <h3>How it works</h3>
            <ul>
              <li><strong>States unfold progressively</strong> - You'll only see future states as your choices unlock them</li>
              <li><strong>Choices matter</strong> - Each decision affects compute growth, safety margins, and race dynamics</li>
              <li><strong>Graphs show impact</strong> - Watch how your actions change key variables over simulation time</li>
              <li><strong>Multiple endings</strong> - Paths range from aligned ASI to extinction</li>
            </ul>
          </section>

          <section>
            <h3>Key Variables</h3>
            <ul>
              <li><strong>Compute</strong> - Training compute (FLOP), grows exponentially</li>
              <li><strong>Safety Margin</strong> - Alignment research vs capability progress</li>
              <li><strong>Race Pressure</strong> - US-China competitive dynamics</li>
              <li><strong>Espionage Risk</strong> - Probability of model weight theft</li>
            </ul>
          </section>

          <section>
            <h3>Making Choices</h3>
            <p>
              At decision points, you'll see available actions with their expected impacts.
              Choose carefully - some paths lead to safety, others to catastrophe.
            </p>
          </section>
        </div>

        <button className="tutorial-start" onClick={onClose}>
          Start Simulation
        </button>
      </div>
    </div>
  )
}

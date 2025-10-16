import React from 'react';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-400">About Simulacra</h1>
          <p className="text-lg text-gray-400">Where Simulation Becomes Hyperreality</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300">
          {/* Philosophy */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">The Concept of Simulacra</h2>
            <p className="leading-relaxed mb-3">
              French philosopher <strong>Jean Baudrillard</strong> described <em>simulacra</em> as copies without originals—
              simulations that become more "real" than reality itself. In his theory of hyperreality,
              the boundaries between simulation and reality collapse.
            </p>
            <p className="leading-relaxed">
              This game embodies that concept: an AI-generated crisis simulation where synthetic decision-makers interact
              with human players, creating emergent narratives that feel authentic despite being entirely artificial.
              The simulation becomes its own reality—a hyperreal space for exploring high-stakes decision-making.
            </p>
          </section>

          {/* What is it */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">What is a Tabletop Exercise?</h2>
            <p className="leading-relaxed">
              A <strong>Tabletop Exercise (TTX)</strong> is a simulated crisis scenario where participants role-play as key decision-makers.
              It's a serious game designed to test strategic thinking and reveal how complex systems respond under pressure.
            </p>
          </section>

          {/* How it works */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">How Simulacra Works</h2>
            <p className="leading-relaxed mb-4">
              In this AI-powered simulation, you assume a critical role during an escalating crisis. You must make tough choices
              with limited resources to advance your secret objectives while maintaining public trust.
            </p>
            <p className="leading-relaxed">
              An <strong>AI Game Master</strong> generates the story, controls other characters, and shapes the consequences of your actions,
              ensuring a unique challenge every time.
            </p>
          </section>

          {/* Features */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Key Features</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">▸</span>
                <div>
                  <strong>Dynamic Scenarios:</strong> AI generates unique crises and evolving events
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">▸</span>
                <div>
                  <strong>Role-Playing:</strong> Choose from six unique roles with public and hidden objectives
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">▸</span>
                <div>
                  <strong>AI Opponents:</strong> Sophisticated AI players with strategic decision-making
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">▸</span>
                <div>
                  <strong>Action Trees:</strong> Visualize all available options and chosen actions each round
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">▸</span>
                <div>
                  <strong>Counterfactual Analysis:</strong> See what would happen if no one acted
                </div>
              </li>
            </ul>
          </section>

          {/* Tech Stack */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Technology</h2>
            <p className="leading-relaxed">
              Built with <strong>React</strong>, <strong>TypeScript</strong>, and <strong>Vite</strong>.
              Powered by LLM APIs via <strong>LiteLLM proxy</strong> for dynamic content generation.
              Data persistence with <strong>Prisma</strong> and <strong>PostgreSQL</strong>.
            </p>
          </section>

          {/* Credits */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Credits</h2>
            <p className="leading-relaxed mb-3">
              Simulacra is an experimental project exploring AI-driven interactive storytelling and strategic decision-making.
            </p>
            <p className="leading-relaxed text-sm text-gray-400">
              Contact: <span className="text-blue-400">matib275 [at] gmail [dot] com</span>
            </p>
          </section>

          {/* Links */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Resources</h2>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/bhi5hmaraj/ai-risk-ttx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                GitHub Repository
              </a>
              <a
                href="https://www.lesswrong.com/posts/epn73xEkeu5T4sZa5/rehearsing-the-future-tabletop-exercises-for-risks-and"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                LessWrong Blog Post
              </a>
            </div>
          </section>
        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-8">
          <button
            onClick={onBack}
            className="px-8 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

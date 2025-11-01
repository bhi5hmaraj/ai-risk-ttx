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
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-400">About Simulacra™</h1>
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
            <p className="leading-relaxed mb-3">
              Baudrillard famously argued that modern society lives in a world of spectacle and simulation,
              where media and representation have replaced authentic experience. His work directly inspired{' '}
              <strong>The Matrix</strong>, where the simulated world is more compelling and "real" to its inhabitants
              than the actual reality outside.
            </p>
            <p className="leading-relaxed mb-3">
              But here's the twist: while Baudrillard critiqued simulation as a source of passivity and alienation,
              <strong>Simulacra™</strong> uses simulation as a tool for <strong>agency and preparedness</strong>. By rehearsing future crises
              in a hyperreal space, players move from abstract hand-wringing to concrete action. The simulation doesn't
              trap you—it trains you.
            </p>
            <p className="leading-relaxed">
              This game embodies that paradox: an AI-generated crisis simulation where synthetic decision-makers interact
              with human players, creating emergent narratives that feel authentic despite being entirely artificial.
              The simulation becomes its own reality—a hyperreal space for exploring high-stakes decision-making.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-2">Why This Game Is Different:</p>
                <p className="text-sm text-gray-400 leading-relaxed mb-2">
                  Most communication operates on multiple levels. When someone says "The AI might malfunction," they might mean:
                  the literal truth (Level 1), a strategic warning to position themselves (Level 2), a signal that they're the
                  "safety-conscious one" (Level 3), or pure buzzword deployment (Level 4). Each level moves further from truth.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed mb-2">
                  <strong className="text-gray-300">Simulacra™ commits to Level 1</strong>—literal truth-seeking. Every AI-generated
                  scenario, consequence, and counterfactual asks: "What would <em>actually</em> happen?" Not "What makes me look good?"
                  or "What signals the right tribal affiliation?" but "What does this crisis reveal about how systems fail?"
                </p>
                <p className="text-sm text-gray-400 leading-relaxed mb-2">
                  This is why the game works as a learning tool: the simulation isn't trying to manipulate you or make you conform.
                  It's trying to show you reality—even when that reality is uncomfortable, surprising, or contradicts your assumptions.
                  The map becomes territory not through deception, but through rigorous commitment to truth.
                </p>
                <div className="flex flex-col gap-1.5 ml-4">
                  <a
                    href="https://www.lesswrong.com/posts/KnQpzYRR4ogPNtzem/a-crisper-explanation-of-simulacrum-levels"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    → A Crisper Explanation of Simulacrum Levels (start here)
                  </a>
                  <a
                    href="https://www.lesswrong.com/w/simulacrum-levels"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    → Simulacrum Levels (full framework)
                  </a>
                  <a
                    href="https://www.lesswrong.com/posts/qDmnyEMtJkE9Wrpau/simulacra-levels-and-their-interactions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    → Simulacra Levels and Their Interactions
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-2">Philosophical Background:</p>
                <div className="flex flex-col gap-1.5 ml-4">
                  <a
                    href="https://youtu.be/S96e6TdJlNE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    → The Society of the Spectacle and Baudrillard's critique
                  </a>
                  <a
                    href="https://www.youtube.com/watch?v=h7urGFiy_3g"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    → Simulacra and Simulation explained (accessible intro)
                  </a>
                </div>
              </div>
            </div>
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
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">How Simulacra™ Works</h2>
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
              Built with <strong>Next.js</strong> (App Router), <strong>React</strong>, and <strong>TypeScript</strong>.
              Powered by LLM APIs via <strong>LiteLLM proxy</strong> for dynamic content generation.
              Data persistence with <strong>Prisma</strong> and <strong>PostgreSQL</strong>.
            </p>
          </section>

          {/* FAQ */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">How accurate are LLMs at simulating crises?</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  Recent research shows LLMs are rapidly approaching human-expert forecasting ability. According to{' '}
                  <a
                    href="https://forecastingresearch.substack.com/p/ai-llm-forecasting-model-forecastbench-benchmark"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    ForecastBench benchmark data
                  </a>
                  , GPT-4.5 achieves a Brier score of 0.101 versus superforecasters' 0.081—already surpassing non-expert
                  forecasters. LLMs improve by ~0.016 Brier points annually and are projected to reach superforecaster
                  parity by late 2026.
                </p>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  In practical terms: LLMs already have robust world models for predicting how complex systems respond to shocks.
                  While we plan to incorporate more grounded models (economics, epidemiology, etc.) in the future, the native
                  LLM predictions are already quite good—and getting better every year.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Our focus right now is on <strong>gameplay, UI, and accessibility</strong> rather than model accuracy. The
                  bottleneck isn't "can the AI generate plausible scenarios?" (it can) but "can we make the experience engaging
                  enough that people actually learn from it?"
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">How long does a typical game take?</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  A complete game runs for 5 rounds with a 5-minute timer per round. Most players finish in <strong>5-15 minutes</strong>
                  depending on how quickly they make decisions. You can pause the timer at any point if you need a break, and the AI
                  processes consequences while you read the results.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Can I play with friends?</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  Currently, Simulacra™ is a single-player experience where you play alongside AI opponents. This design allows
                  you to explore strategic decision-making at your own pace without coordinating schedules.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Multiplayer support is on our roadmap! We're planning features for asynchronous play (take turns when convenient)
                  and real-time co-op scenarios. If you're interested in collaborative play, let us know through GitHub issues—it helps
                  us prioritize development.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">What are action points and how do they work?</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  You start each game with <strong>3 action points (AP)</strong>. Each action has a cost (1-3 AP), and you gain
                  3 more points every round, up to a maximum of 7 AP total.
                </p>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  <strong>Strategic depth:</strong> You don't have to spend all your points each round. Unused points carry over,
                  allowing you to save up for expensive high-impact actions. You can even skip a round entirely if you want to
                  accumulate resources for later.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  This system rewards both immediate tactical responses and longer-term strategic planning. Do you spend everything
                  now to address urgent threats, or save points for a powerful move later?
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">How do I know if I'm winning?</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  Simulacra™ uses a <strong>dual scoring system</strong>:
                </p>
                <ul className="text-sm text-gray-300 space-y-1 ml-4 mb-2">
                  <li>• <strong>Public Score:</strong> A shared metric (like "Democratic Legitimacy" in the election crisis) visible
                  to all players. If this drops to 0, everyone loses. This creates shared stakes and forces cooperation.</li>
                  <li>• <strong>Hidden Score:</strong> Your personal progress toward secret objectives. This is visible only to you
                  and represents your individual win condition. You might be succeeding personally even as the public situation deteriorates.</li>
                </ul>
                <p className="text-sm text-gray-400 leading-relaxed">
                  This tension between public good and private goals mirrors real-world crisis dynamics. The best players balance both:
                  keeping the system stable enough to achieve their hidden objectives while not letting everything collapse.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Can I create my own scenarios?</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  Yes! In the lobby, select "Custom Scenario" and provide a description. The AI Game Master will generate a complete
                  crisis setup with 6 roles, objectives, and an opening situation tailored to your premise.
                </p>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  If you create something interesting, you can share it with the community by clicking "Make Public" during gameplay.
                  Public scenarios appear in the community library where others can play and upvote them.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  This feature enables exploration of any crisis domain: climate negotiations, corporate mergers, space missions,
                  epidemic response—anything where multiple stakeholders face urgent decisions with competing interests.
                </p>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Credits</h2>
            <p className="leading-relaxed mb-3">
              Simulacra™ is an experimental project exploring AI-driven interactive storytelling and strategic decision-making.
            </p>
            <p className="leading-relaxed text-sm text-gray-400">
              Contact: <span className="text-blue-400">matib275 [at] gmail [dot] com</span>
            </p>
          </section>

          {/* Open Source & Collaboration */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">Open for Collaboration</h2>
            <p className="leading-relaxed mb-3">
              Simulacra™ is an <strong>open-source project</strong> and we welcome contributions from the community!
              Whether you want to add new features, fix bugs, improve documentation, or create new scenarios,
              your contributions are highly valued.
            </p>
            <p className="leading-relaxed">
              Feel free to submit <strong>Pull Requests</strong> on GitHub, open issues for bugs or feature requests,
              or reach out if you have ideas for collaboration. Let's build the future of AI-driven simulations together!
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

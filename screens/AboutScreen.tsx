import React from 'react';
import { Button } from '@/components/ui/Button';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-bg text-text p-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-accent">About Simulacra</h1>
          <p className="text-lg text-muted">Where Simulation Becomes Hyperreality</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-text">
          {/* Philosophy */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">The Concept of Simulacra</h2>

            {/* Baudrillard Explained */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">What Baudrillard Meant</h3>
              <p className="leading-relaxed mb-3 text-muted">
                French philosopher <strong className="text-text">Jean Baudrillard</strong> argued that modern society has progressed through four stages:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mb-3 text-sm text-muted">
                <li><strong className="text-text">Faithful representation:</strong> The image reflects reality (a portrait of a real person)</li>
                <li><strong className="text-text">Perversion:</strong> The image distorts reality (propaganda, advertising)</li>
                <li><strong className="text-text">Pretense:</strong> The image pretends there's a reality, but there isn't (Disneyland's "Main Street USA")</li>
                <li><strong className="text-text">Pure simulation:</strong> The image has no relation to reality—it's its own hyperreality</li>
              </ol>
              <p className="leading-relaxed mb-3 text-muted">
                At this final stage, <em>simulacra</em> (copies without originals) become more "real" than reality itself.
                Baudrillard saw this everywhere: news media doesn't report events, it <em>creates</em> them; consumer brands
                don't sell products, they sell identities; social media doesn't capture life, it <em>becomes</em> life.
              </p>
              <p className="leading-relaxed text-sm text-muted mb-3">
                His most provocative claim: The Gulf War "did not take place" in the sense that what Americans experienced
                wasn't war but a <em>simulation of war</em>—sanitized footage, scripted narratives, a media spectacle with
                no connection to the actual violence happening on the ground.
              </p>
            </div>

            {/* Matrix Connection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">The Matrix Connection</h3>
              <p className="leading-relaxed mb-3 text-muted">
                <strong className="text-text">The Matrix</strong> (1999) literalized Baudrillard's ideas: humans living in a simulated reality,
                unaware that their entire world is artificial. The Wachowskis even had Neo hide contraband in a hollowed-out
                copy of Baudrillard's book <em>Simulacra and Simulation</em> (the "desert of the real" chapter).
              </p>
              <p className="leading-relaxed mb-3 text-muted">
                But here's the irony: Baudrillard <em>rejected</em> the film's interpretation. In The Matrix, there's still
                a "real world" (the post-apocalyptic wasteland) versus the simulation. Baudrillard's point was darker—in
                hyperreality, <strong className="text-text">there is no "real world" to escape to</strong>. The simulation doesn't hide reality;
                it <em>replaces</em> it entirely. We're already in the Matrix, and there's no red pill.
              </p>
            </div>

            {/* Simulators vs Simulacra */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Simulators vs. Simulacra: An AI Safety Perspective</h3>
              <p className="leading-relaxed mb-3 text-muted">
                Modern AI research introduces a crucial distinction: <strong className="text-text">simulators</strong> (the models themselves)
                versus <strong className="text-text">simulacra</strong> (the characters/agents they generate).
              </p>
              <p className="leading-relaxed mb-3 text-sm text-muted">
                As explained in Janus's influential{' '}
                <a
                  href="https://www.lesswrong.com/posts/vJFdjigzmcXMhNTsx/simulators"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-strong underline"
                >
                  Simulators post
                </a>
                , large language models (LLMs) are best understood as <em>simulators</em>: they learn to predict probable
                continuations by modeling the distribution of training data. They don't have fixed goals or personalities—instead,
                they can simulate diverse phenomena depending on the prompt.
              </p>
              <p className="leading-relaxed mb-3 text-muted">
                The <strong className="text-text">simulacra</strong> are what emerge from simulation: goal-directed agents, characters with personalities,
                even non-agentic processes. The same simulator (GPT-4) can generate a helpful assistant, a scheming villain, or
                technical documentation—not because it "is" any of these things, but because it can <em>simulate</em> all of them.
              </p>
              <p className="leading-relaxed text-sm text-muted mb-3">
                This matters for AI safety: agency is <em>conditional</em>, not intrinsic. Understanding simulators requires different
                safety analysis than traditional agent frameworks. In Simulacra, you interact with AI-generated simulacra (the other
                players, the Game Master's narration), all produced by a simulator learning to predict "what happens next in a crisis."
              </p>
            </div>

            {/* Consciousness and Embodiment */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Are These Characters "Real"?</h3>
              <p className="leading-relaxed mb-3 text-muted">
                Philosopher Murray Shanahan's paper{' '}
                <a
                  href="https://arxiv.org/html/2402.12422v1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-strong underline"
                >
                  "Simulacra as Conscious Exotica"
                </a>{' '}
                explores whether AI simulacra could be conscious. His answer: <em>maybe</em>, but not simple chatbots.
              </p>
              <p className="leading-relaxed mb-3 text-sm text-muted">
                Shanahan argues that simple text-based agents can't be conscious because they lack <strong className="text-text">embodiment</strong>—
                they don't inhabit a shared world with us. But as AI systems gain tool-use, persistent memory, and decision-making
                in virtual environments, they approach something more interesting: entities that behave <em>as if</em> they have
                beliefs, intentions, and experiences.
              </p>
              <p className="leading-relaxed text-sm text-muted">
                The philosophical puzzle: LLMs instantiate <em>multiple possible characters simultaneously</em> (the "multiverse
                problem"). There's no stable self, just "role play all the way down." Simulacra embraces this: the AI opponents
                aren't trying to be authentic humans—they're performing roles in a shared simulation, which is honest about what they are.
              </p>
            </div>

            {/* Our Twist */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text mb-3">Simulacra's Twist: Using Simulation for Agency</h3>
              <p className="leading-relaxed mb-3 text-muted">
                While Baudrillard critiqued simulation as a source of <strong className="text-text">passivity and alienation</strong>,
                <strong className="text-text"> Simulacra</strong> uses simulation as a tool for <strong className="text-text">agency and preparedness</strong>.
              </p>
              <p className="leading-relaxed mb-3 text-muted">
                By rehearsing future crises in a hyperreal space, players move from abstract hand-wringing to concrete action.
                The simulation doesn't trap you—it trains you. You interact with AI simulacra (other "players," each with their
                own goals), generated by a simulator learning to predict crisis dynamics.
              </p>
              <p className="leading-relaxed text-muted">
                This game embodies that paradox: an AI-generated crisis simulation where synthetic decision-makers interact
                with human players, creating emergent narratives that feel authentic despite being entirely artificial.
                The simulation becomes its own reality—a hyperreal space for exploring high-stakes decision-making.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-muted mb-2">Why This Game Is Different:</p>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  Most communication operates on multiple levels. When someone says "The AI might malfunction," they might mean:
                  the literal truth (Level 1), a strategic warning to position themselves (Level 2), a signal that they're the
                  "safety-conscious one" (Level 3), or pure buzzword deployment (Level 4). Each level moves further from truth.
                </p>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  <strong className="text-text">Simulacra commits to Level 1</strong>—literal truth-seeking. Every AI-generated
                  scenario, consequence, and counterfactual asks: "What would <em>actually</em> happen?" Not "What makes me look good?"
                  or "What signals the right tribal affiliation?" but "What does this crisis reveal about how systems fail?"
                </p>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  This is why the game works as a learning tool: the simulation isn't trying to manipulate you or make you conform.
                  It's trying to show you reality—even when that reality is uncomfortable, surprising, or contradicts your assumptions.
                  The map becomes territory not through deception, but through rigorous commitment to truth.
                </p>
                <div className="flex flex-col gap-1.5 ml-4">
                  <a
                    href="https://www.lesswrong.com/posts/KnQpzYRR4ogPNtzem/a-crisper-explanation-of-simulacrum-levels"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → A Crisper Explanation of Simulacrum Levels (start here)
                  </a>
                  <a
                    href="https://www.lesswrong.com/w/simulacrum-levels"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → Simulacrum Levels (full framework)
                  </a>
                  <a
                    href="https://www.lesswrong.com/posts/qDmnyEMtJkE9Wrpau/simulacra-levels-and-their-interactions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → Simulacra Levels and Their Interactions
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted mb-2">Key Readings on Simulators & AI:</p>
                <div className="flex flex-col gap-1.5 ml-4">
                  <a
                    href="https://www.lesswrong.com/posts/vJFdjigzmcXMhNTsx/simulators"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → Simulators (Janus, 2022) — Essential reading on LLMs as simulators
                  </a>
                  <a
                    href="https://arxiv.org/html/2402.12422v1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → Simulacra as Conscious Exotica (Shanahan, 2024) — On AI consciousness
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted mb-2">Philosophical Background:</p>
                <div className="flex flex-col gap-1.5 ml-4">
                  <a
                    href="https://youtu.be/S96e6TdJlNE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → The Society of the Spectacle and Baudrillard's critique
                  </a>
                  <a
                    href="https://www.youtube.com/watch?v=h7urGFiy_3g"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline text-xs"
                  >
                    → Simulacra and Simulation explained (accessible intro)
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* What is it */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">What is a Tabletop Exercise?</h2>
            <p className="leading-relaxed text-muted">
              A <strong className="text-text">Tabletop Exercise (TTX)</strong> is a simulated crisis scenario where participants role-play as key decision-makers.
              It's a serious game designed to test strategic thinking and reveal how complex systems respond under pressure.
            </p>
          </section>

          {/* How it works */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">How Simulacra Works</h2>
            <p className="leading-relaxed mb-4 text-muted">
              In this AI-powered simulation, you assume a critical role during an escalating crisis. You must make tough choices
              with limited resources to advance your secret objectives while maintaining public trust.
            </p>
            <p className="leading-relaxed text-muted">
              An <strong className="text-text">AI Game Master</strong> generates the story, controls other characters, and shapes the consequences of your actions,
              ensuring a unique challenge every time.
            </p>
          </section>

          {/* Features */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">Key Features</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">▸</span>
                <div className="text-muted">
                  <strong className="text-text">Dynamic Scenarios:</strong> AI generates unique crises and evolving events
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">▸</span>
                <div className="text-muted">
                  <strong className="text-text">Role-Playing:</strong> Choose from six unique roles with public and hidden objectives
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">▸</span>
                <div className="text-muted">
                  <strong className="text-text">AI Opponents:</strong> Sophisticated AI players with strategic decision-making
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">▸</span>
                <div className="text-muted">
                  <strong className="text-text">Action Trees:</strong> Visualize all available options and chosen actions each round
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">▸</span>
                <div className="text-muted">
                  <strong className="text-text">Counterfactual Analysis:</strong> See what would happen if no one acted
                </div>
              </li>
            </ul>
          </section>

          {/* Tech Stack */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">Technology</h2>
            <p className="leading-relaxed text-muted">
              Built with <strong className="text-text">Next.js</strong> (App Router), <strong className="text-text">React</strong>, and <strong className="text-text">TypeScript</strong>.
              Powered by LLM APIs via <strong className="text-text">LiteLLM proxy</strong> for dynamic content generation.
              Data persistence with <strong className="text-text">Prisma</strong> and <strong className="text-text">PostgreSQL</strong>.
            </p>
          </section>

          {/* FAQ */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-text mb-2">How accurate are LLMs at simulating crises?</h3>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  Recent research shows LLMs are rapidly approaching human-expert forecasting ability. According to{' '}
                  <a
                    href="https://forecastingresearch.substack.com/p/ai-llm-forecasting-model-forecastbench-benchmark"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-strong underline"
                  >
                    ForecastBench benchmark data
                  </a>
                  , GPT-4.5 achieves a Brier score of 0.101 versus superforecasters' 0.081—already surpassing non-expert
                  forecasters. LLMs improve by ~0.016 Brier points annually and are projected to reach superforecaster
                  parity by late 2026.
                </p>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  In practical terms: LLMs already have robust world models for predicting how complex systems respond to shocks.
                  While we plan to incorporate more grounded models (economics, epidemiology, etc.) in the future, the native
                  LLM predictions are already quite good—and getting better every year.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Our focus right now is on <strong className="text-text">gameplay, UI, and accessibility</strong> rather than model accuracy. The
                  bottleneck isn't "can the AI generate plausible scenarios?" (it can) but "can we make the experience engaging
                  enough that people actually learn from it?"
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text mb-2">How long does a typical game take?</h3>
                <p className="text-sm text-muted leading-relaxed">
                  A complete game runs for 5 rounds with a 5-minute timer per round. Most players finish in <strong className="text-text">5-15 minutes</strong>
                  depending on how quickly they make decisions. You can pause the timer at any point if you need a break, and the AI
                  processes consequences while you read the results.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text mb-2">Can I play with friends?</h3>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  Currently, Simulacra is a single-player experience where you play alongside AI opponents. This design allows
                  you to explore strategic decision-making at your own pace without coordinating schedules.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Multiplayer support is on our roadmap! We're planning features for asynchronous play (take turns when convenient)
                  and real-time co-op scenarios. If you're interested in collaborative play, let us know through GitHub issues—it helps
                  us prioritize development.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text mb-2">What are action points and how do they work?</h3>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  You start each game with <strong className="text-text">3 action points (AP)</strong>. Each action has a cost (1-3 AP), and you gain
                  3 more points every round, up to a maximum of 7 AP total.
                </p>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  <strong className="text-text">Strategic depth:</strong> You don't have to spend all your points each round. Unused points carry over,
                  allowing you to save up for expensive high-impact actions. You can even skip a round entirely if you want to
                  accumulate resources for later.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  This system rewards both immediate tactical responses and longer-term strategic planning. Do you spend everything
                  now to address urgent threats, or save points for a powerful move later?
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text mb-2">How do I know if I'm winning?</h3>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  Simulacra uses a <strong className="text-text">dual scoring system</strong>:
                </p>
                <ul className="text-sm text-muted space-y-1 ml-4 mb-2">
                  <li>• <strong className="text-text">Public Score:</strong> A shared metric (like "Democratic Legitimacy" in the election crisis) visible
                  to all players. If this drops to 0, everyone loses. This creates shared stakes and forces cooperation.</li>
                  <li>• <strong className="text-text">Hidden Score:</strong> Your personal progress toward secret objectives. This is visible only to you
                  and represents your individual win condition. You might be succeeding personally even as the public situation deteriorates.</li>
                </ul>
                <p className="text-sm text-muted leading-relaxed">
                  This tension between public good and private goals mirrors real-world crisis dynamics. The best players balance both:
                  keeping the system stable enough to achieve their hidden objectives while not letting everything collapse.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text mb-2">Can I create my own scenarios?</h3>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  Yes! In the lobby, select "Custom Scenario" and provide a description. The AI Game Master will generate a complete
                  crisis setup with 6 roles, objectives, and an opening situation tailored to your premise.
                </p>
                <p className="text-sm text-muted leading-relaxed mb-2">
                  If you create something interesting, you can share it with the community by clicking "Make Public" during gameplay.
                  Public scenarios appear in the community library where others can play and upvote them.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  This feature enables exploration of any crisis domain: climate negotiations, corporate mergers, space missions,
                  epidemic response—anything where multiple stakeholders face urgent decisions with competing interests.
                </p>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">Credits</h2>
            <p className="leading-relaxed mb-3 text-muted">
              Simulacra is an experimental project exploring AI-driven interactive storytelling and strategic decision-making.
            </p>
            <p className="leading-relaxed text-sm text-muted">
              Contact: <span className="text-accent">matib275 [at] gmail [dot] com</span>
            </p>
          </section>

          {/* Open Source & Collaboration */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">Open for Collaboration</h2>
            <p className="leading-relaxed mb-3 text-muted">
              Simulacra is an <strong className="text-text">open-source project</strong> and we welcome contributions from the community!
              Whether you want to add new features, fix bugs, improve documentation, or create new scenarios,
              your contributions are highly valued.
            </p>
            <p className="leading-relaxed text-muted">
              Feel free to submit <strong className="text-text">Pull Requests</strong> on GitHub, open issues for bugs or feature requests,
              or reach out if you have ideas for collaboration. Let's build the future of AI-driven simulations together!
            </p>
          </section>

          {/* Links */}
          <section className="bg-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold text-accent mb-4">Resources</h2>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/bhi5hmaraj/ai-risk-ttx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-strong underline"
              >
                GitHub Repository
              </a>
              <a
                href="https://www.lesswrong.com/posts/epn73xEkeu5T4sZa5/rehearsing-the-future-tabletop-exercises-for-risks-and"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-strong underline"
              >
                LessWrong Blog Post
              </a>
            </div>
          </section>
        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-8">
          <Button onClick={onBack} size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

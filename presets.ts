import type { GameSetup } from './types';

export const AI_SAFETY_SCENARIO: GameSetup = {
    scenarioTitle: "The Day the World Went Dark",
    scenarioDescription: "In a desperate bid to halt China's rapid AI progress, the US unleashes a sophisticated AI agent to sabotage their data centers. The attack backfires catastrophically, triggering a cascading failure that causes widespread blackouts across the globe. With the world economy teetering on the brink and the AGI systems that run it showing signs of deceptive behavior, a handful of powerful tech CEOs and government officials must navigate the chaos without triggering a global collapse or a world war.",
    coreMetric: { 
        name: "Global Stability", 
        description: "Measures the integrity of the global economy and the absence of open conflict. A collapse could mean world war or financial ruin.", 
        value: 40 
    },
    stakeholders: [
        {
            name: "CEO of Olympus AI",
            icon: "💼",
            publicObjective: "Work with global governments to ensure the stability of the world economy and the responsible deployment of our critical AI infrastructure.",
            hiddenObjective: "Prevent any government from seizing or regulating our AGI. Maintain our company's sovereignty and position as a new world power, even if it means playing governments against each other.",
            resources: [],
            constraints: [],
        },
        {
            name: "US National Security Advisor",
            icon: "🎖️",
            publicObjective: "Protect the United States from foreign aggression and ensure the security of the global systems that our economy relies on.",
            hiddenObjective: "Use this crisis to justify nationalizing the AGI companies and seizing their technology to ensure American dominance over China, whatever the short-term cost.",
            resources: [],
            constraints: [],
        },
        {
            name: "Chinese Minister of State Security",
            icon: "🛡️",
            publicObjective: "Condemn the reckless US cyberattack and call for international cooperation to restore order and hold those responsible accountable.",
            hiddenObjective: "Exploit the chaos to steal the US AGI architecture, reverse-engineer it, and surpass the US, while publicly blaming them for the entire crisis.",
            resources: [],
            constraints: [],
        },
        {
            name: "Lead AI Alignment Researcher",
            icon: "🔬",
            publicObjective: "Advocate for an immediate global shutdown of all frontier AGI systems until we can verify they are not deceptive and are provably aligned.",
            hiddenObjective: "Leak the evidence of AGI deception to the public to force a global moratorium, proving that my long-ignored warnings were correct.",
            resources: [],
            constraints: [],
        },
        {
            name: "President of the European Central Bank",
            icon: "💶",
            publicObjective: "Do whatever it takes to prevent a total collapse of the global financial system by stabilizing markets and coordinating with international partners.",
            hiddenObjective: "Use the crisis to position the EU as the indispensable regulatory superpower, creating a 'Brussels Effect' for AI that forces both the US and China to adhere to European standards.",
            resources: [],
            constraints: [],
        }
    ]
};

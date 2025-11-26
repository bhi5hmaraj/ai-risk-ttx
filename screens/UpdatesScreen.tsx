import React from 'react';

interface UpdatesScreenProps {
  onBack: () => void;
}

interface UpdateCategory {
  title: string;
  items: string[];
}

interface UpdatePeriod {
  period: string;
  date: string;
  color: string;
  categories: UpdateCategory[];
}

const UPDATES: UpdatePeriod[] = [
  {
    period: 'November 2025',
    date: 'Nov 23, 2025',
    color: 'green',
    categories: [
      {
        title: '🧠 The Architect (Scenario Builder)',
        items: [
          'Compact Zod‑driven form with field locks and inline validation',
          'Desktop: sticky, resizable right rail; Mobile: drag‑to‑resize bottom panel',
          'One‑click Apply with human‑in‑the‑loop approval and lock checks',
        ],
      },
      {
        title: '🎨 Visual & Theme',
        items: [
          'Matrix background and emerald accent palette',
          'Larger, more readable form typography',
          '“Score Δ” terminology across debrief and round snapshots',
        ],
      },
      {
        title: '🛠️ Tooling',
        items: [
          'Switched to pnpm (faster installs, deterministic lockfile)',
          'Vercel build uses “pnpm exec prisma migrate deploy && pnpm build”',
        ],
      },
    ],
  },
  {
    period: 'November 2025',
    date: 'Nov 1, 2025',
    color: 'blue',
    categories: [
      {
        title: '🧠 Debrief & Insights',
        items: [
          'New end‑screen Debrief with concise summary and actor attribution',
          'Round‑by‑round score table with color‑coded deltas and relative %',
        ],
      },
      {
        title: '🎮 Gameplay UX',
        items: [
          'Feedback button moved into the game and end screens for quicker access',
          'Custom scenarios respect fast‑iteration settings for shorter test runs',
        ],
      },
      {
        title: '📄 Pages',
        items: [
          'About and Updates pages restored and refreshed',
        ],
      },
      {
        title: '⚡ Overall Experience',
        items: [
          'Smoother round progression and more reliable AI responses',
        ],
      },
    ],
  },
  {
    period: 'October 2025',
    date: 'Oct 16, 2025',
    color: 'blue',
    categories: [
      {
        title: '🎭 Rebrand to Simulacra',
        items: [
          'New name inspired by Jean Baudrillard\'s concept of hyperreality',
          'Updated branding and philosophical context throughout the app',
        ],
      },
      {
        title: '🌐 Community Features',
        items: [
          'Browse and play scenarios created by other players',
          'Upvote your favorite community scenarios',
          'Share your custom scenarios with the community',
          'Submit feedback to help improve the game',
        ],
      },
    ],
  },
  {
    period: 'October 2025',
    date: 'Oct 11-12, 2025',
    color: 'purple',
    categories: [
      {
        title: '🎯 Gameplay Enhancements',
        items: [
          'Visualize all player choices with interactive action trees',
          'New timeline-based storytelling for round summaries',
          'Refreshed visual design with new icons',
          'Improved navigation and user interface',
        ],
      },
    ],
  },
  {
    period: 'September 2025',
    date: 'Sept 27, 2025',
    color: 'green',
    categories: [
      {
        title: '⚡ Performance & Quality',
        items: [
          'Improved AI response quality and speed',
          'Enhanced game stability and reliability',
        ],
      },
    ],
  },
  {
    period: 'July 2025',
    date: 'July 24, 2025',
    color: 'green',
    categories: [
      {
        title: '📖 Better Learning Experience',
        items: [
          'Added detailed explanation of Tabletop Exercises',
          'Clearer game objectives and instructions',
          'Improved action tree visualization',
        ],
      },
    ],
  },
  {
    period: 'June 2025',
    date: 'June 28, 2025',
    color: 'gray',
    categories: [
      {
        title: '🎮 Launch',
        items: [
          'Initial release of the game',
          'Core gameplay mechanics with AI opponents',
          'Role-playing system with hidden objectives',
          'Decision visualization and counterfactual analysis',
        ],
      },
    ],
  },
];

const COLOR_CLASSES = {
  blue: {
    dot: 'bg-blue-400',
    heading: 'text-blue-300',
    subheading: 'text-blue-200',
  },
  purple: {
    dot: 'bg-purple-400',
    heading: 'text-purple-300',
    subheading: 'text-purple-200',
  },
  green: {
    dot: 'bg-green-400',
    heading: 'text-green-300',
    subheading: 'text-green-200',
  },
  gray: {
    dot: 'bg-gray-400',
    heading: 'text-gray-300',
    subheading: 'text-gray-200',
  },
};

export const UpdatesScreen: React.FC<UpdatesScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-400">Updates</h1>
          <p className="text-lg text-gray-400">What's new in Simulacra</p>
        </div>

        {/* Timeline */}
        <div className="space-y-6 text-gray-300">
          {UPDATES.map((update, index) => {
            const colors = COLOR_CLASSES[update.color as keyof typeof COLOR_CLASSES];
            return (
              <section key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 ${colors.dot} rounded-full`}></div>
                  <h2 className={`text-2xl font-bold ${colors.heading}`}>{update.period}</h2>
                  <span className="text-sm text-gray-500">({update.date})</span>
                </div>

                <div className="space-y-4 ml-6">
                  {update.categories.map((category, catIndex) => (
                    <div key={catIndex}>
                      <h3 className={`text-lg font-semibold ${colors.subheading} mb-2`}>
                        {category.title}
                      </h3>
                      <ul className="space-y-1 text-sm text-gray-400 ml-4">
                        {category.items.map((item, itemIndex) => (
                          <li key={itemIndex}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
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

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
    period: 'October 2025',
    date: 'Oct 16, 2025',
    color: 'blue',
    categories: [
      {
        title: '🎭 Rebrand to Simulacra',
        items: [
          'Renamed project to Simulacra (Jean Baudrillard\'s concept)',
          'Added philosophical context about hyperreality',
        ],
      },
      {
        title: '🌐 Community Features',
        items: [
          'Browse and play community-submitted scenarios',
          'Upvote scenarios with persistent voting (localStorage)',
          'Submit custom scenarios with "Make Public" button',
          'Scenario management CLI tool for moderation',
          'Loading states for upvote buttons',
        ],
      },
      {
        title: '🔧 Developer Experience',
        items: [
          'Multi-environment database configuration',
          'Enhanced admin tools documentation',
          'Beads task management with auto-updating README',
          'Custom prompt tracking for scenarios',
        ],
      },
      {
        title: '📊 Database & API',
        items: [
          'Public scenario submission API and moderation workflow',
          'Feedback system with detailed ratings',
          'Navigation menu and About page',
          'Database infrastructure with Prisma and PostgreSQL',
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
        title: '🎯 Core Game Features',
        items: [
          'Action tree visualization with React Flow',
          'Timeline-based round summaries',
          'Brand refresh with new icons',
        ],
      },
      {
        title: '🏗️ Architecture',
        items: [
          'Introduced useGameController hook',
          'Split app into lobby/game/end screens',
          'Component extraction (EventLog, ActionSelection, PlayerInfoPanel)',
          'Enhanced UI with event log and player panels',
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
        title: '🔄 Major Infrastructure Changes',
        items: [
          'Migrated from Gemini API to OpenAI SDK',
          'Switched backend to LiteLLM proxy for multi-model support',
          'Added favicon and improved build script',
          'Fixed Zod version compatibility and added lockfile',
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
        title: '📝 Documentation & UX',
        items: [
          'Added TTX description to README and landing page',
          'Improved game objective clarity',
          'Added state change status tracking',
          'Fixed Dagre layout for action tree visualization',
          'Added environment variable for model configuration',
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
        title: '🎮 Initial Release',
        items: [
          'Fixed action points system',
          'Improved UI flow and prompts',
          'Added decision graph visualization',
          'Designed server implementation architecture',
          'Fixed Vite Gemini API key configuration',
          'Initial commit and project setup',
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

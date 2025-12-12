import React from 'react';
import { Button } from '@/components/ui/Button';

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
  categories: UpdateCategory[];
}

const UPDATES: UpdatePeriod[] = [
  {
    period: 'December 2025',
    date: 'Dec 12, 2025',
    categories: [
      {
        title: 'Visual & Theme',
        items: [
          'New Matrix-inspired UI theme with emerald accent colors',
          'Tokenized color system for consistent styling',
          'Collapsible Key Moments cards for cleaner game view',
          'Side-by-side round comparison layout',
          'Updated status bar with better icons and score deltas',
        ],
      },
      {
        title: 'UX Improvements',
        items: [
          'Streamlined debrief screen with neutral impact colors',
          'Improved About and Updates pages styling',
        ],
      },
    ],
  },
  {
    period: 'November 2025',
    date: 'Nov 23, 2025',
    categories: [
      {
        title: 'The Architect (Scenario Builder)',
        items: [
          'Compact Zod-driven form with field locks and inline validation',
          'Desktop: sticky, resizable right rail; Mobile: drag-to-resize bottom panel',
          'One-click Apply with human-in-the-loop approval and lock checks',
        ],
      },
      {
        title: 'Visual & Theme',
        items: [
          'Matrix background and emerald accent palette',
          'Larger, more readable form typography',
          '"Score Δ" terminology across debrief and round snapshots',
        ],
      },
      {
        title: 'Tooling',
        items: [
          'Switched to pnpm (faster installs, deterministic lockfile)',
          'Vercel build uses "pnpm exec prisma migrate deploy && pnpm build"',
        ],
      },
    ],
  },
  {
    period: 'November 2025',
    date: 'Nov 1, 2025',
    categories: [
      {
        title: 'Debrief & Insights',
        items: [
          'New end-screen Debrief with concise summary and actor attribution',
          'Round-by-round score table with color-coded deltas and relative %',
        ],
      },
      {
        title: 'Gameplay UX',
        items: [
          'Feedback button moved into the game and end screens for quicker access',
          'Custom scenarios respect fast-iteration settings for shorter test runs',
        ],
      },
      {
        title: 'Pages',
        items: [
          'About and Updates pages restored and refreshed',
        ],
      },
      {
        title: 'Overall Experience',
        items: [
          'Smoother round progression and more reliable AI responses',
        ],
      },
    ],
  },
  {
    period: 'October 2025',
    date: 'Oct 16, 2025',
    categories: [
      {
        title: 'Rebrand to Simulacra',
        items: [
          'New name inspired by Jean Baudrillard\'s concept of hyperreality',
          'Updated branding and philosophical context throughout the app',
        ],
      },
      {
        title: 'Community Features',
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
    categories: [
      {
        title: 'Gameplay Enhancements',
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
    categories: [
      {
        title: 'Performance & Quality',
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
    categories: [
      {
        title: 'Better Learning Experience',
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
    categories: [
      {
        title: 'Launch',
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

export const UpdatesScreen: React.FC<UpdatesScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-bg text-text p-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-accent">Updates</h1>
          <p className="text-lg text-muted">What's new in Simulacra</p>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {UPDATES.map((update, index) => (
            <section key={index} className="bg-panel rounded-lg p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-accent rounded-full" />
                <h2 className="text-2xl font-bold text-accent">{update.period}</h2>
                <span className="text-sm text-muted">({update.date})</span>
              </div>

              <div className="space-y-4 ml-6">
                {update.categories.map((category, catIndex) => (
                  <div key={catIndex}>
                    <h3 className="text-lg font-semibold text-text mb-2">
                      {category.title}
                    </h3>
                    <ul className="space-y-1 text-sm text-muted ml-4">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2">
                          <span className="text-accent mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
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

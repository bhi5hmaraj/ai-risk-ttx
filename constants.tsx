
import React from 'react';
import type { RoleData } from './types';
import { RoleName } from './types';

// Simple emoji-based icon component
const EmojiIcon: React.FC<{ emoji: string; className?: string }> = ({ emoji, className = '' }) => (
  <span className={`text-2xl ${className}`} role="img" aria-label="role icon">
    {emoji}
  </span>
);

export const ROLES: Record<RoleName, RoleData> = {
  [RoleName.ELECTION_COMMISSIONER]: {
    name: RoleName.ELECTION_COMMISSIONER,
    icon: (props) => <EmojiIcon emoji="🏛️" {...props} />,
    publicObjective: "Ensure fair, transparent elections and maintain public trust.",
    hiddenObjective: "Maintain authority and avoid blame for system failures.",
    resources: ["Legal Authority", "Voter Database Access", "Official Communications"],
    constraints: ["Political Pressure", "Limited Technical Expertise", "Bureaucratic Processes"],
  },
  [RoleName.TECH_CEO]: {
    name: RoleName.TECH_CEO,
    icon: (props) => <EmojiIcon emoji="💻" {...props} />,
    publicObjective: "Maintain platform integrity while supporting democratic processes.",
    hiddenObjective: "Protect company valuation and avoid regulatory backlash.",
    resources: ["Technical Infrastructure", "Data Analytics", "Engineering Team"],
    constraints: ["Shareholder Pressure", "Regulatory Scrutiny", "Public Relations Risk"],
  },
  [RoleName.JOURNALIST]: {
    name: RoleName.JOURNALIST,
    icon: (props) => <EmojiIcon emoji="📰" {...props} />,
    publicObjective: "Report accurate information and expose threats to democracy.",
    hiddenObjective: "Secure exclusive stories and advance career prospects.",
    resources: ["Media Platform", "Source Network", "Investigative Skills"],
    constraints: ["Editorial Deadlines", "Verification Requirements", "Competitive Pressure"],
  },
  [RoleName.FEDERAL_REGULATOR]: {
    name: RoleName.FEDERAL_REGULATOR,
    icon: (props) => <EmojiIcon emoji="⚖️" {...props} />,
    publicObjective: "Enforce laws and protect national security interests.",
    hiddenObjective: "Expand agency authority and demonstrate effectiveness.",
    resources: ["Legal Powers", "Intelligence Access", "Enforcement Authority"],
    constraints: ["Jurisdictional Limits", "Political Oversight", "Resource Limitations"],
  },
  [RoleName.CAMPAIGN_MANAGER]: {
    name: RoleName.CAMPAIGN_MANAGER,
    icon: (props) => <EmojiIcon emoji="📊" {...props} />,
    publicObjective: "Ensure fair electoral competition and voter engagement.",
    hiddenObjective: "Secure electoral victory for candidate at any cost.",
    resources: ["Campaign Infrastructure", "Voter Data", "Communication Channels"],
    constraints: ["Legal Restrictions", "Time Pressures", "Opposition Research"],
  },
  [RoleName.CYBERSECURITY_EXPERT]: {
    name: RoleName.CYBERSECURITY_EXPERT,
    icon: (props) => <EmojiIcon emoji="🛡️" {...props} />,
    publicObjective: "Protect electoral systems from technical threats.",
    hiddenObjective: "Establish reputation as indispensable security authority.",
    resources: ["Technical Expertise", "Security Tools", "Threat Intelligence"],
    constraints: ["Resource Limitations", "Coordination Challenges", "Attribution Difficulties"],
  },
};

// Game configuration (imported from pure TypeScript file for backend compatibility)
export { GAME_CONFIG } from './gameConfig';
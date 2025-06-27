
import React from 'react';
import type { RoleData } from './types';
import { RoleName } from './types';
import { 
    BuildingLibraryIcon, 
    CpuChipIcon, 
    NewspaperIcon, 
    ScaleIcon, 
    UserGroupIcon, 
    ShieldCheckIcon 
} from './components/Icons';

export const ROLES: Record<RoleName, RoleData> = {
  [RoleName.ELECTION_COMMISSIONER]: {
    name: RoleName.ELECTION_COMMISSIONER,
    icon: (props) => <BuildingLibraryIcon {...props} />,
    publicObjective: "Ensure fair, transparent elections and maintain public trust.",
    hiddenObjective: "Maintain authority and avoid blame for system failures.",
    resources: ["Legal Authority", "Voter Database Access", "Official Communications"],
    constraints: ["Political Pressure", "Limited Technical Expertise", "Bureaucratic Processes"],
  },
  [RoleName.TECH_CEO]: {
    name: RoleName.TECH_CEO,
    icon: (props) => <CpuChipIcon {...props} />,
    publicObjective: "Maintain platform integrity while supporting democratic processes.",
    hiddenObjective: "Protect company valuation and avoid regulatory backlash.",
    resources: ["Technical Infrastructure", "Data Analytics", "Engineering Team"],
    constraints: ["Shareholder Pressure", "Regulatory Scrutiny", "Public Relations Risk"],
  },
  [RoleName.JOURNALIST]: {
    name: RoleName.JOURNALIST,
    icon: (props) => <NewspaperIcon {...props} />,
    publicObjective: "Report accurate information and expose threats to democracy.",
    hiddenObjective: "Secure exclusive stories and advance career prospects.",
    resources: ["Media Platform", "Source Network", "Investigative Skills"],
    constraints: ["Editorial Deadlines", "Verification Requirements", "Competitive Pressure"],
  },
  [RoleName.FEDERAL_REGULATOR]: {
    name: RoleName.FEDERAL_REGULATOR,
    icon: (props) => <ScaleIcon {...props} />,
    publicObjective: "Enforce laws and protect national security interests.",
    hiddenObjective: "Expand agency authority and demonstrate effectiveness.",
    resources: ["Legal Powers", "Intelligence Access", "Enforcement Authority"],
    constraints: ["Jurisdictional Limits", "Political Oversight", "Resource Limitations"],
  },
  [RoleName.CAMPAIGN_MANAGER]: {
    name: RoleName.CAMPAIGN_MANAGER,
    icon: (props) => <UserGroupIcon {...props} />,
    publicObjective: "Ensure fair electoral competition and voter engagement.",
    hiddenObjective: "Secure electoral victory for candidate at any cost.",
    resources: ["Campaign Infrastructure", "Voter Data", "Communication Channels"],
    constraints: ["Legal Restrictions", "Time Pressures", "Opposition Research"],
  },
  [RoleName.CYBERSECURITY_EXPERT]: {
    name: RoleName.CYBERSECURITY_EXPERT,
    icon: (props) => <ShieldCheckIcon {...props} />,
    publicObjective: "Protect electoral systems from technical threats.",
    hiddenObjective: "Establish reputation as indispensable security authority.",
    resources: ["Technical Expertise", "Security Tools", "Threat Intelligence"],
    constraints: ["Resource Limitations", "Coordination Challenges", "Attribution Difficulties"],
  },
};

export const GAME_CONFIG = {
  MAX_ROUNDS: 5,
  ACTION_PHASE_SECONDS: 120, // 2 minutes
  ACTION_POINTS_PER_ROUND: 3,
};

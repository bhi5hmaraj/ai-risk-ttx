import type { UseFormRegister } from 'react-hook-form';
import type { CustomScenarioForm } from '@/types/customScenarioForm';

export type ScenarioComments = Record<string, string>;

export interface SectionCommonProps {
  disabled?: boolean;
  comments: ScenarioComments;
  setFieldComment: (path: string, value: string) => void;
}

export interface BasicsSectionProps extends SectionCommonProps {
  register: UseFormRegister<CustomScenarioForm>;
  errors?: any;
}

export interface CoreMetricSectionProps extends SectionCommonProps {
  register: UseFormRegister<CustomScenarioForm>;
  errors?: any;
}

export interface StakeholdersSectionProps extends SectionCommonProps {
  register: UseFormRegister<CustomScenarioForm>;
  stakeholders: CustomScenarioForm['stakeholders'];
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export interface ActionBarProps {
  isSubmitting: boolean;
  onCompile: () => void;
  onContinue: () => Promise<void> | void;
  submitErrors: string[];
}

export interface PreviewProps {
  preview: string;
}

export interface DebugStatusProps {
  debug: boolean;
  status: {
    titleOK: boolean;
    descOK: boolean;
    cmNameOK: boolean;
    cmDescOK: boolean;
    cmValueOK: boolean;
    stakeholderCount: number;
    stakeholdersMinOK: boolean;
  };
}

export interface CopilotRightRailProps {
  instructions: string;
  comments?: ScenarioComments; // optional while comments UI is disabled (TODO)
  onSubmitMessage?: (message: string) => void;
  onInProgress?: (inProgress: boolean) => void;
  locks?: Record<string, boolean>;
}

export interface CopilotBindingsProps {
  // Form state snapshot
  scenarioTitle: string;
  scenarioDescription: string;
  coreMetric: CustomScenarioForm['coreMetric'];
  stakeholders: CustomScenarioForm['stakeholders'];
  comments?: ScenarioComments; // optional while comments UI is disabled (TODO)
  locks?: Record<string, boolean>;
  maxRounds: number | '';
  // Mutators
  setValue: (name: any, value: any) => void;
  setComments: (updater: (prev: ScenarioComments) => ScenarioComments) => void;
  // Ephemeral instructions
  additionalInstructions?: string;
}

export interface ScenarioFormProps {
  control: any;
  register: any;
  setValue: (name: any, value: any) => void;
  watch: any;
  getValues: () => any;
  isSubmitting: boolean;
  errors?: any;
  comments?: ScenarioComments; // optional while comments UI is disabled (TODO)
  setFieldComment?: (path: string, value: string) => void; // optional
  locks: Record<string, boolean>;
  setFieldLock: (path: string, value: boolean) => void;
  compileDescription: () => string;
  handleContinue: () => Promise<void> | void;
  submitErrors: string[];
  preview: string;
  stakeholdersCount: number;
  validationStatus: any;
}

"use client";

import React from 'react';
import type { CopilotBindingsProps } from './types';
import { useScenarioCopilot } from '@/hooks/useScenarioCopilot';
import { useCopilotReadable, useCopilotAdditionalInstructions } from '@/components/copilot/adapter';

export function CopilotBindings({
  scenarioTitle,
  scenarioDescription,
  coreMetric,
  stakeholders,
  comments,
  locks,
  maxRounds,
  setValue,
  setComments,
  additionalInstructions,
}: CopilotBindingsProps) {
  useScenarioCopilot(
    (name: any, value: any) => setValue(name as any, value as any),
    (updater) => setComments((prev) => (typeof updater === 'function' ? updater(prev) : prev)),
    (path) => !!(locks && locks[path])
  );
  useCopilotReadable(
    {
      description: 'Custom Scenario Builder state',
      value: { scenarioTitle, scenarioDescription, coreMetric, stakeholders, comments, locks, maxRounds },
      categories: ['custom-scenario', 'form'],
    },
    [scenarioTitle, scenarioDescription, coreMetric, stakeholders, comments, locks, maxRounds]
  );
  useCopilotAdditionalInstructions(
    { instructions: additionalInstructions || '', available: additionalInstructions ? 'enabled' : 'disabled' },
    [additionalInstructions]
  );
  return null;
}

export default CopilotBindings;


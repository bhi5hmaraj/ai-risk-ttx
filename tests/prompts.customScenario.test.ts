import { describe, it, expect } from 'vitest';
import { getCustomScenarioPromptAndSchema } from '../prompts';

describe('getCustomScenarioPromptAndSchema', () => {
  it('includes guidance for antagonists and mixed stakeholder types', () => {
    const { prompt, schema } = getCustomScenarioPromptAndSchema('Test scenario about grid outage and misinformation.');
    expect(prompt.toLowerCase()).toContain('antagonist');
    expect(prompt.toLowerCase()).toContain('protagonist');
    expect(prompt.toLowerCase()).toContain('individuals');
    expect(prompt.toLowerCase()).toContain('institutions');
    // keeps original schema reference
    expect(schema).toBeDefined();
  });
});


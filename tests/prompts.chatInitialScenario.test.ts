import { describe, it, expect } from 'vitest';
import { getInitialScenarioChatPrompt } from '../prompts';

describe('getInitialScenarioChatPrompt', () => {
  it('includes fairness and neutrality guidance for initial chat scenario', () => {
    const prompt = getInitialScenarioChatPrompt();
    expect(prompt.toLowerCase()).toContain('fairness');
    expect(prompt.toLowerCase()).toContain('avoid national/ethnic stereotyping');
  });
});


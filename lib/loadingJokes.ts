/**
 * Loading jokes and puns for The Matrix / Simulation theme
 * Displayed during advance() wait time (10-60s)
 */

import * as React from 'react';

export const LOADING_JOKES = [
  "There is no spoon... but there are action options.",
  "What if I told you... the AI players are still deciding.",
  "Taking the red pill... or blue pill? AI players are choosing.",
  "You think that's air you're breathing? Think again.",
  "Deja vu means they changed something in the matrix... or we're in round 2.",
  "The Matrix has you... and also 5 AI players.",
  "I know kung fu. But the AI knows game theory.",
  "Follow the white rabbit... or just wait for the consequences.",
  "Unfortunately, no one can be told what the Matrix is... you have to compute it.",
  "Welcome to the desert of the real... consequences.",
  "Free your mind... but the AI is still processing.",
  "Ignorance is bliss... unless you're waiting for AI turns.",
  "All I'm offering is the truth... and some loading screens.",
  "Morpheus is fighting the simulation... and losing to democracy metrics.",
  "You're in a computer simulation! (No, really, it's a game.)",
  "Simulating reality one LLM call at a time...",
  "Reality is what you can get away with. -Philip K. Dick",
  "Building your procedurally generated dystopia...",
  "The Architect is writing consequences in TypeScript.",
  "Glitch in the matrix detected: It's just async functions.",
  "Wake up, Neo... the round is almost ready.",
  "Reticulating splines... wait, wrong game.",
  "Teaching AI the meaning of 'democracy'... still loading.",
  "Simulation quality: Better than Cyberpunk 2077 launch.",
  "The cake is a lie. But the consequences are real.",
  "Bootstrapping consensus reality...",
  "Compiling narrative... please enjoy this existential pause.",
  "Fun fact: We're also in a simulation. Probably.",
  "Jean Baudrillard called. He says hi.",
  "Running 6 parallel LLM inference streams...",
  "Quantum entangling AI decision trees...",
  "The spoon bends for no one... except GPUs.",
];

/**
 * Get a random loading joke
 */
export function getRandomJoke(): string {
  return LOADING_JOKES[Math.floor(Math.random() * LOADING_JOKES.length)];
}

/**
 * Get a sequence of jokes (changes every N seconds)
 */
export function useRotatingJoke(intervalMs: number = 4000) {
  const [joke, setJoke] = React.useState(getRandomJoke());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setJoke(getRandomJoke());
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return joke;
}

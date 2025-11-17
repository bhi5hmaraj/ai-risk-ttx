/**
 * Zustand Store for Simulation State
 *
 * Manages:
 * - Simulation engine instance
 * - Playback controls (play, pause, speed)
 * - User settings (duration, speed)
 */

import { create } from 'zustand';
import { SimulationEngine } from '../engine/SimulationEngine';

const useSimulationStore = create((set, get) => ({
  // Simulation engine
  engine: new SimulationEngine(),

  // Simulation state
  simState: null,

  // Playback controls
  isPlaying: false,
  speed: 1, // months per second
  playbackIntervalId: null,

  // User settings
  targetDurationMinutes: 5, // How long user wants to play in real-world minutes
  simDurationMonths: 36, // How many sim months to cover

  // Initialize simulation
  initialize: () => {
    const { engine } = get();
    engine.reset();
    set({ simState: engine.getState() });
  },

  // Calculate sim speed based on user settings
  calculateSpeed: () => {
    const { targetDurationMinutes, simDurationMonths } = get();
    // months per second = total months / (minutes * 60)
    const speed = simDurationMonths / (targetDurationMinutes * 60);
    set({ speed });
  },

  // Set target duration and recalculate speed
  setTargetDuration: (minutes) => {
    set({ targetDurationMinutes: minutes });
    get().calculateSpeed();
  },

  // Set simulation settings (called from IntroModal)
  setSimulationSettings: ({ simDurationMonths, targetDurationMinutes, speed }) => {
    set({
      simDurationMonths,
      targetDurationMinutes,
      speed,
    });
  },

  // Start simulation playback
  play: () => {
    const { isPlaying, playbackIntervalId } = get();

    if (isPlaying) return;

    // Start interval for stepping simulation
    const intervalId = setInterval(() => {
      get().step();
    }, 100); // Update every 100ms

    set({
      isPlaying: true,
      playbackIntervalId: intervalId,
    });
  },

  // Pause simulation playback
  pause: () => {
    const { playbackIntervalId } = get();

    if (playbackIntervalId) {
      clearInterval(playbackIntervalId);
    }

    set({
      isPlaying: false,
      playbackIntervalId: null,
    });
  },

  // Step simulation forward
  step: () => {
    const { engine, speed, isPlaying } = get();

    // Calculate deltaMonths based on speed and interval
    // At 100ms interval, we advance by (speed * 0.1) months
    const deltaMonths = speed * 0.1;

    const canContinue = engine.step(deltaMonths);

    // Update state
    set({ simState: engine.getState() });

    // Auto-pause if at branch point or end
    if ((engine.isAtBranchPoint() || engine.isEnded()) && isPlaying) {
      get().pause();
    }
  },

  // Manual step forward (for debugging)
  stepManual: (months = 1) => {
    const { engine } = get();
    engine.step(months);
    set({ simState: engine.getState() });
  },

  // Make a user choice at branch point
  makeChoice: (choiceId) => {
    const { engine } = get();
    engine.makeChoice(choiceId);
    set({ simState: engine.getState() });

    // Resume playback after choice
    get().play();
  },

  // Reset simulation
  reset: () => {
    get().pause();
    get().initialize();
  },

  // Set playback speed multiplier
  setSpeedMultiplier: (multiplier) => {
    const { simDurationMonths, targetDurationMinutes } = get();
    const baseSpeed = simDurationMonths / (targetDurationMinutes * 60);
    set({ speed: baseSpeed * multiplier });
  },
}));

export default useSimulationStore;

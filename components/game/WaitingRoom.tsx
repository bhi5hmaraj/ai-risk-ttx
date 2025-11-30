"use client";

/**
 * WaitingRoom - Multiplayer lobby following idiomatic Colyseus patterns
 *
 * Data Sources:
 * - room.state.roomCode (Schema) - Room code for sharing
 * - room.state.players (MapSchema) - Connected players (single source of truth)
 * - room.state.phase (Schema) - Current phase
 *
 * State Sync:
 * ✅ Reads from room.state directly (no separate React state)
 * ✅ Colyseus auto-syncs via onChange (handled by ColyseusProvider)
 * ✅ Phase-based rendering (only shows when phase === 'lobby')
 * ❌ No custom player_joined/left messages (Schema handles this)
 */

import React, { useState, useCallback } from 'react';
import { useColyseus } from '@/providers/ColyseusProvider';
import { useGameSenders } from '@/hooks/useGameSenders';
import { useGameStore } from '@/stores/gameStore';
import { useSessionStore } from '@/stores/sessionStore';
import { UserGroupIcon, ShareIcon, CheckCircleIcon, ClockIcon, LoadingSpinner } from '../Icons';
import QRCode from 'react-qr-code';

export function WaitingRoom() {
  const { room, state, players } = useColyseus();
  const gameState = useGameStore((s) => s.gameState);
  const mySessionId = useSessionStore((s) => s.colyseusSessionId);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Read from Schema - Colyseus automatically syncs
  const roomCode = state?.roomCode || '';
  const phase = state?.phase || '';
  const playerList = players ? Array.from(players.values()) : [];

  // Determine host from Zustand gameState.hostId (centralized)
  const hostSessionId = (gameState as any)?.hostId || (state as any)?.hostId || '';
  const isHost = Boolean(mySessionId && hostSessionId && mySessionId === hostSessionId);
  if (typeof window !== 'undefined') {
    console.log('[WaitingRoom] host check', { hostSessionId, mySessionId, isHost });
  }

  // Only render during lobby phase
  if (phase !== 'lobby') {
    return null;
  }

  const maxPlayers = 6;
  const emptySlots = maxPlayers - playerList.length;
  const humanList = playerList.filter((p: any) => p.isHuman);
  const readyHumans = humanList.filter((p: any) => typeof p.role === 'string' && p.role.trim().length > 0);
  const allHumansReady = humanList.length > 0 && readyHumans.length === humanList.length;

  // Generate shareable link
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game/${roomCode}`
    : `https://simulacra.cc/game/${roomCode}`;

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [shareUrl]);

  // Toggle QR code visibility
  const handleToggleQR = useCallback(() => {
    setShowQR(prev => !prev);
  }, []);

  // Start game (host only)
  const { startGame } = useGameSenders();
  const handleStartGame = useCallback(() => {
    if (!isHost) return;
    setIsStarting(true);
    startGame();
    // Loading state will clear when phase changes from 'lobby' to 'action' (component unmounts)
  }, [isHost, startGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-700 p-8">
        {/* Room Code Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Waiting Room</h1>
          <div className="bg-gray-900 rounded-lg p-6 border-2 border-blue-500">
            <p className="text-gray-400 text-sm mb-2">Room Code</p>
            <p className="text-6xl font-mono font-bold text-blue-400 tracking-widest">
              {roomCode || 'LOADING...'}
            </p>
          </div>
        </div>

        {/* Share Options */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleCopyLink}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <ShareIcon className="h-5 w-5 mr-2" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleToggleQR}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>

        {/* QR Code (collapsible) */}
        {showQR && (
          <div className="bg-white p-4 rounded-lg mb-8 flex justify-center">
            <QRCode value={shareUrl} size={200} />
          </div>
        )}

        {/* Player List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <UserGroupIcon className="h-6 w-6 mr-2 text-blue-400" />
            Players ({playerList.length}/{maxPlayers}) • Humans {readyHumans.length}/{humanList.length} ready
            </h2>
          </div>

          <div className="space-y-2">
            {/* Connected Players */}
            {playerList.map((player, index) => (
              <div
                key={player.sessionId}
                className="bg-gray-700 rounded-lg p-4 flex items-center justify-between border border-gray-600"
              >
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                  <div>
                    <p className="text-white font-semibold">
                      {player.name || 'Player'}
                      {player.sessionId === room?.sessionId && (
                        <span className="text-blue-400 ml-2">(You)</span>
                      )}
                    </p>
                    <p className="text-gray-400 text-sm">{player.role || 'Selecting role...'}</p>
                  </div>
                </div>
                {player.sessionId === hostSessionId ? (
                  <span className="bg-yellow-600 text-white text-xs font-bold px-3 py-1 rounded-full">HOST</span>
                ) : (!player.role || !player.role.trim()) ? (
                  <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">PENDING ROLE</span>
                ) : null}
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-gray-800 rounded-lg p-4 flex items-center border border-gray-700 border-dashed"
              >
                <ClockIcon className="h-5 w-5 text-gray-500 mr-3" />
                <p className="text-gray-500 font-medium">Waiting for player...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Button / Waiting Message */}
        <div className="text-center">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!allHumansReady || isStarting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg flex items-center justify-center"
            >
              {isStarting ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Starting Game...
                </>
              ) : (
                allHumansReady ? 'Start Game' : 'Waiting for all to select roles'
              )}
            </button>
          ) : (
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <p className="text-gray-300 font-medium">
                Waiting for host to start the game...
              </p>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Share the room code or link with friends to invite them to join.
          </p>
        </div>
      </div>
    </div>
  );
}

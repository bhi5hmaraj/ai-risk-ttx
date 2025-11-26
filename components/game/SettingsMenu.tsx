"use client";

import React, { useRef, useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { XMarkIcon } from '../Icons';

interface SettingsMenuProps {
  onOpenActionTree: () => void;
  canViewActionTree: boolean;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onOpenActionTree,
  canViewActionTree,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    isSettingsOpen,
    setSettingsOpen,
    isHistoryOpen,
    setHistoryOpen,
    fontSize,
    setFontSize,
  } = useUIStore();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSettingsOpen, setSettingsOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSettingsOpen, setSettingsOpen]);

  if (!isSettingsOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[240px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Settings</h3>
        <button
          onClick={() => setSettingsOpen(false)}
          className="p-0.5 hover:bg-gray-700 rounded transition-colors"
          aria-label="Close settings"
        >
          <XMarkIcon className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Settings Content */}
      <div className="p-3 space-y-3">
        {/* Font Size */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Font Size</label>
          <div className="flex gap-1.5">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  fontSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700" />

        {/* View Options */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">View Options</label>
          <div className="space-y-1.5">
            <button
              onClick={() => {
                setHistoryOpen(!isHistoryOpen);
                setSettingsOpen(false);
              }}
              className="w-full px-3 py-1.5 rounded text-left text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
            >
              {isHistoryOpen ? 'Hide History' : 'Show History'}
            </button>
            <button
              onClick={() => {
                if (canViewActionTree) {
                  onOpenActionTree();
                  setSettingsOpen(false);
                }
              }}
              disabled={!canViewActionTree}
              className={`w-full px-3 py-1.5 rounded text-left text-xs font-medium transition-colors ${
                canViewActionTree
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              View Action Tree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

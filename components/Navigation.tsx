"use client";

import React, { useState, useEffect } from 'react';
import { Bars3Icon, XMarkIcon, HomeIcon, ChatBubbleLeftIcon, InformationCircleIcon, BellIcon } from './Icons';

interface NavigationProps {
  onNavigateHome: () => void;
  onOpenFeedback: () => void;
  onOpenAbout: () => void;
  onOpenUpdates: () => void;
  showFeedback?: boolean; // Only show feedback option when in game
  autoCollapse?: boolean; // Auto-collapse on mount (for game screen)
}

export const Navigation: React.FC<NavigationProps> = ({
  onNavigateHome,
  onOpenFeedback,
  onOpenAbout,
  onOpenUpdates,
  showFeedback = false,
  autoCollapse = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(autoCollapse);

  const closeMenu = () => setIsMenuOpen(false);

  // Listen for Escape key to show navbar when collapsed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCollapsed) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  const handleNavigateHome = () => {
    onNavigateHome();
    closeMenu();
  };

  const handleOpenFeedback = () => {
    onOpenFeedback();
    closeMenu();
  };

  const handleOpenAbout = () => {
    onOpenAbout();
    closeMenu();
  };

  const handleOpenUpdates = () => {
    onOpenUpdates();
    closeMenu();
  };

  return (
    <>
      {/* Floating toggle button when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-2 right-2 z-50 p-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-lg"
          aria-label="Show navigation"
          title="Show navigation"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
      )}

      <nav className={`fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 transition-transform duration-300 ${
        isCollapsed ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              <button
                className="text-left"
                onClick={handleNavigateHome}
                aria-label="Go to Home"
                title="Go to Home"
              >
                <h1 className="text-xl font-bold text-blue-300 hover:text-white transition-colors">Simulacra</h1>
              </button>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs text-gray-500">AI Tabletop Exercise</span>
              <ModelInfo />
            </div>
            <span className="text-xs text-gray-500 hidden sm:inline lg:hidden">AI Tabletop Exercise</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <NavButton onClick={handleNavigateHome} icon={HomeIcon} label="Home" />
            {showFeedback && (
              <NavButton onClick={handleOpenFeedback} icon={ChatBubbleLeftIcon} label="Feedback" />
            )}
            <NavButton onClick={handleOpenUpdates} icon={BellIcon} label="Updates" />
            <NavButton onClick={handleOpenAbout} icon={InformationCircleIcon} label="About" />
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Hide navigation"
              title="Hide navigation (Escape to show)"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900">
          <div className="px-4 py-3 space-y-2">
            <MobileNavButton onClick={handleNavigateHome} icon={HomeIcon} label="Home" />
            {showFeedback && (
              <MobileNavButton onClick={handleOpenFeedback} icon={ChatBubbleLeftIcon} label="Feedback" />
            )}
            <MobileNavButton onClick={handleOpenUpdates} icon={BellIcon} label="Updates" />
            <MobileNavButton onClick={handleOpenAbout} icon={InformationCircleIcon} label="About" />
          </div>
        </div>
      )}
    </nav>
    </>
  );
};

// Desktop Navigation Button
const NavButton: React.FC<{
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </button>
);

// Mobile Navigation Button
const MobileNavButton: React.FC<{
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-left text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
  </button>
);

// Model Information Display
const ModelInfo: React.FC = () => {
  const model = process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || 'Unknown';
  const isFlashLite = model.toLowerCase().includes('flash') && model.toLowerCase().includes('lite');

  return (
    <div className="text-xs text-gray-600">
      <span>Powered by {model}</span>
      {isFlashLite && (
        <span className="ml-1 text-gray-500" title="Fast responses, moving to Pro models in the future">
          (⚡ fast)
        </span>
      )}
    </div>
  );
};

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
  allowCollapse?: boolean; // Show close button to allow collapsing (only for game screen)
}

export const Navigation: React.FC<NavigationProps> = ({
  onNavigateHome,
  onOpenFeedback,
  onOpenAbout,
  onOpenUpdates,
  showFeedback = false,
  autoCollapse = false,
  allowCollapse = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(autoCollapse);

  const closeMenu = () => setIsMenuOpen(false);

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
      <nav className={`fixed top-0 left-0 right-0 z-40 bg-bg backdrop-blur-sm border-b border-border transition-transform duration-300 ${
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
                <h1 className="text-xl font-bold text-accent hover:text-accent-strong transition-colors">Simulacra</h1>
              </button>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs text-muted">AI Tabletop Exercise</span>
            </div>
            <span className="text-xs text-muted hidden sm:inline lg:hidden">AI Tabletop Exercise</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <NavButton onClick={handleNavigateHome} icon={HomeIcon} label="Home" />
            {showFeedback && (
              <NavButton onClick={handleOpenFeedback} icon={ChatBubbleLeftIcon} label="Feedback" />
            )}
            <NavButton onClick={handleOpenUpdates} icon={BellIcon} label="Updates" />
            <NavButton onClick={handleOpenAbout} icon={InformationCircleIcon} label="About" />
            {allowCollapse && (
              <button
                onClick={() => {
                  setIsCollapsed(true);
                  // Also update the DOM classes directly to sync with StatusBar
                  const navbar = document.querySelector('nav');
                  if (navbar) {
                    navbar.classList.remove('translate-y-0');
                    navbar.classList.add('-translate-y-full');
                  }
                }}
                className="p-2 rounded-md text-muted hover:text-text hover:bg-panel transition-colors"
                aria-label="Hide navigation"
                title="Hide navigation"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-muted hover:text-text hover:bg-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
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
        <div className="md:hidden border-t border-border bg-panel">
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
    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-text hover:bg-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
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
    className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-left text-muted hover:text-text hover:bg-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
  </button>
);

